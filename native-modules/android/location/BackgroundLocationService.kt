package com.paypass.safetyfence.location

import android.app.ActivityManager
import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.app.Service
import android.content.Context
import android.content.Intent
import android.os.Build
import android.os.IBinder
import android.os.Looper
import android.util.Log
import com.google.android.gms.location.LocationCallback
import com.google.android.gms.location.LocationRequest
import com.google.android.gms.location.LocationResult
import com.google.android.gms.location.LocationServices
import com.google.android.gms.location.Priority
import org.json.JSONArray
import org.json.JSONObject
import java.io.OutputStreamWriter
import java.net.HttpURLConnection
import java.net.URL
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale
import java.util.TimeZone
import java.util.concurrent.Executors
import kotlin.math.atan2
import kotlin.math.cos
import kotlin.math.sin
import kotlin.math.sqrt

class BackgroundLocationService : Service() {
    private val executor = Executors.newSingleThreadExecutor()
    private val fusedClient by lazy { LocationServices.getFusedLocationProviderClient(this) }
    private var callback: LocationCallback? = null

    // 지오펜스 관련 상수
    companion object {
        private const val TAG = "BgLocationService"
        private const val NOTIFICATION_ID = 3001
        private const val GEOFENCE_NOTIFICATION_ID = 3002
        private const val GEOFENCE_RADIUS_METERS = 100.0
        private const val ENTRY_LOCK_TTL_MS = 30_000L
        const val ACTION_START = "com.paypass.safetyfence.BG_LOCATION_START"
        const val ACTION_STOP = "com.paypass.safetyfence.BG_LOCATION_STOP"
    }

    override fun onBind(intent: Intent?): IBinder? = null

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        when (intent?.action) {
            ACTION_START -> {
                Log.i(TAG, "Service start requested")
                startForeground(NOTIFICATION_ID, buildNotification())
                startUpdates()
            }
            ACTION_STOP -> {
                Log.i(TAG, "Service stop requested")
                stopUpdates()
                stopForeground(STOP_FOREGROUND_REMOVE)
                stopSelf()
            }
        }
        return START_STICKY
    }

    override fun onDestroy() {
        Log.i(TAG, "Service destroyed")
        stopUpdates()
        executor.shutdown()
        super.onDestroy()
    }

    private fun startUpdates() {
        if (callback != null) return
        Log.i(TAG, "Starting location updates")

        val request = LocationRequest.Builder(Priority.PRIORITY_HIGH_ACCURACY, 15_000)
            .setMinUpdateDistanceMeters(10f)
            .setMinUpdateIntervalMillis(15_000)
            .build()

        callback = object : LocationCallback() {
            override fun onLocationResult(result: LocationResult) {
                val location = result.lastLocation ?: return
                Log.d(TAG, "Location update lat=${location.latitude}, lng=${location.longitude}, t=${location.time}")

                // 위치 전송
                sendLocation(location.latitude, location.longitude, location.time)

                // 지오펜스 체크 (백그라운드에서만)
                if (!isAppInForeground()) {
                    checkGeofences(location.latitude, location.longitude)
                }
            }
        }

        try {
            fusedClient.requestLocationUpdates(request, callback as LocationCallback, Looper.getMainLooper())
            Log.i(TAG, "Location updates requested")
        } catch (e: Exception) {
            Log.e(TAG, "Failed to request location updates", e)
        }
    }

    private fun stopUpdates() {
        Log.i(TAG, "Stopping location updates")
        callback?.let {
            fusedClient.removeLocationUpdates(it)
        }
        callback = null
    }

    /**
     * 앱이 포그라운드에 있는지 확인
     */
    private fun isAppInForeground(): Boolean {
        val activityManager = getSystemService(Context.ACTIVITY_SERVICE) as ActivityManager
        val appProcesses = activityManager.runningAppProcesses ?: return false
        val packageName = packageName
        for (appProcess in appProcesses) {
            if (appProcess.importance == ActivityManager.RunningAppProcessInfo.IMPORTANCE_FOREGROUND
                && appProcess.processName == packageName) {
                return true
            }
        }
        return false
    }

    // ==================== 위치 전송 ====================

    private fun sendLocation(lat: Double, lng: Double, timestamp: Long) {
        // 포그라운드에서는 WebSocket이 전송하므로 HTTP 전송 스킵
        if (isAppInForeground()) {
            Log.d(TAG, "App is in foreground, skipping HTTP send (WebSocket handles it)")
            return
        }

        val prefs = getSharedPreferences(BackgroundLocationModule.PREFS_NAME, Context.MODE_PRIVATE)
        val baseUrl = prefs.getString(BackgroundLocationModule.KEY_BASE_URL, null) ?: return
        val apiKey = prefs.getString(BackgroundLocationModule.KEY_API_KEY, null) ?: return
        val userNumber = prefs.getString(BackgroundLocationModule.KEY_USER_NUMBER, null) ?: return

        executor.execute {
            try {
                Log.d(TAG, "Sending location to ${baseUrl.trimEnd('/')}/location for user=$userNumber")
                val url = URL("${baseUrl.trimEnd('/')}/location")
                val conn = (url.openConnection() as HttpURLConnection).apply {
                    requestMethod = "POST"
                    doOutput = true
                    connectTimeout = 30000
                    readTimeout = 30000
                    setRequestProperty("Content-Type", "application/json")
                    setRequestProperty("X-API-Key", apiKey)
                    setRequestProperty("userNumber", userNumber)
                }

                val payload = JSONObject().apply {
                    put("latitude", lat)
                    put("longitude", lng)
                    put("timestamp", timestamp)
                }

                OutputStreamWriter(conn.outputStream).use { writer ->
                    writer.write(payload.toString())
                    writer.flush()
                }

                val code = conn.responseCode
                conn.disconnect()
                Log.i(TAG, "Location sent. code=$code")
            } catch (e: Exception) {
                Log.e(TAG, "Failed to send location", e)
            }
        }
    }

    // ==================== 지오펜스 체크 ====================

    /**
     * Haversine 공식으로 두 지점 간 거리 계산 (미터 단위)
     */
    private fun calculateDistance(lat1: Double, lon1: Double, lat2: Double, lon2: Double): Double {
        val R = 6371000.0 // 지구 반지름 (미터)
        val dLat = Math.toRadians(lat2 - lat1)
        val dLon = Math.toRadians(lon2 - lon1)
        val a = sin(dLat / 2) * sin(dLat / 2) +
                cos(Math.toRadians(lat1)) * cos(Math.toRadians(lat2)) *
                sin(dLon / 2) * sin(dLon / 2)
        val c = 2 * atan2(sqrt(a), sqrt(1 - a))
        return R * c
    }

    /**
     * 현재 시간이 startTime과 endTime 사이에 있는지 확인
     */
    private fun isWithinTimeRange(startTime: String?, endTime: String?): Boolean {
        if (startTime.isNullOrEmpty() || endTime.isNullOrEmpty()) return true

        return try {
            val format = SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss", Locale.getDefault())
            format.timeZone = TimeZone.getDefault()

            val normalizedStart = startTime.replace(" ", "T").replace(Regex("\\.\\d+$"), "")
            val normalizedEnd = endTime.replace(" ", "T").replace(Regex("\\.\\d+$"), "")

            val start = format.parse(normalizedStart)
            val end = format.parse(normalizedEnd)
            val now = Date()

            if (start != null && end != null) {
                now.time >= start.time && now.time <= end.time
            } else {
                true
            }
        } catch (e: Exception) {
            Log.w(TAG, "Time parsing failed, treating as active: $e")
            true
        }
    }

    /**
     * 지오펜스 캐시 읽기
     */
    private fun getGeofenceCache(): JSONArray? {
        return try {
            val prefs = getSharedPreferences(BackgroundLocationModule.PREFS_NAME, Context.MODE_PRIVATE)
            val cacheStr = prefs.getString(BackgroundLocationModule.KEY_GEOFENCE_CACHE, null) ?: return null
            val cacheObj = JSONObject(cacheStr)
            cacheObj.optJSONArray("data")
        } catch (e: Exception) {
            Log.e(TAG, "Failed to read geofence cache", e)
            null
        }
    }

    /**
     * 진입 상태 읽기/쓰기
     */
    private fun getEntryState(): MutableMap<Int, Boolean> {
        val prefs = getSharedPreferences(BackgroundLocationModule.PREFS_NAME, Context.MODE_PRIVATE)
        val stateStr = prefs.getString(BackgroundLocationModule.KEY_GEOFENCE_ENTRY_STATE, "{}") ?: "{}"
        val result = mutableMapOf<Int, Boolean>()
        try {
            val json = JSONObject(stateStr)
            json.keys().forEach { key ->
                result[key.toInt()] = json.getBoolean(key)
            }
        } catch (e: Exception) {
            Log.e(TAG, "Failed to parse entry state", e)
        }
        return result
    }

    private fun saveEntryState(state: Map<Int, Boolean>) {
        val prefs = getSharedPreferences(BackgroundLocationModule.PREFS_NAME, Context.MODE_PRIVATE)
        val json = JSONObject()
        state.forEach { (key, value) -> json.put(key.toString(), value) }
        prefs.edit().putString(BackgroundLocationModule.KEY_GEOFENCE_ENTRY_STATE, json.toString()).apply()
    }

    /**
     * 진입 락 읽기/쓰기 (30초 중복 방지)
     */
    private fun getEntryLocks(): MutableMap<Int, Long> {
        val prefs = getSharedPreferences(BackgroundLocationModule.PREFS_NAME, Context.MODE_PRIVATE)
        val locksStr = prefs.getString(BackgroundLocationModule.KEY_GEOFENCE_ENTRY_LOCKS, "{}") ?: "{}"
        val result = mutableMapOf<Int, Long>()
        try {
            val json = JSONObject(locksStr)
            json.keys().forEach { key ->
                result[key.toInt()] = json.getLong(key)
            }
        } catch (e: Exception) {
            Log.e(TAG, "Failed to parse entry locks", e)
        }
        return result
    }

    private fun saveEntryLocks(locks: Map<Int, Long>) {
        val prefs = getSharedPreferences(BackgroundLocationModule.PREFS_NAME, Context.MODE_PRIVATE)
        val json = JSONObject()
        locks.forEach { (key, value) -> json.put(key.toString(), value) }
        prefs.edit().putString(BackgroundLocationModule.KEY_GEOFENCE_ENTRY_LOCKS, json.toString()).apply()
    }

    /**
     * 지오펜스 체크 메인 함수
     */
    private fun checkGeofences(lat: Double, lng: Double) {
        val geofences = getGeofenceCache()
        if (geofences == null || geofences.length() == 0) {
            Log.d(TAG, "No geofences to check")
            return
        }

        Log.d(TAG, "Checking ${geofences.length()} geofences")

        val entryState = getEntryState()
        val entryLocks = getEntryLocks()
        val now = System.currentTimeMillis()
        var stateChanged = false
        var locksChanged = false

        for (i in 0 until geofences.length()) {
            val fence = geofences.optJSONObject(i) ?: continue
            val id = fence.optInt("id", -1)
            if (id == -1) continue

            val name = fence.optString("name", "")
            val fenceLat = fence.optDouble("latitude", 0.0)
            val fenceLng = fence.optDouble("longitude", 0.0)
            val type = fence.optInt("type", 0) // 0: 영구, 1: 일시
            val startTime = fence.optString("startTime", null)
            val endTime = fence.optString("endTime", null)

            // 1. 거리 체크
            val distance = calculateDistance(lat, lng, fenceLat, fenceLng)
            val isInside = distance <= GEOFENCE_RADIUS_METERS

            // 2. 시간 체크 (일시적 지오펜스만)
            val isTimeActive = type == 0 || isWithinTimeRange(startTime, endTime)

            // 3. 진입 조건
            val canEnter = isInside && isTimeActive
            val wasInside = entryState[id] == true

            Log.d(TAG, "Fence[$id] $name: distance=${distance.toInt()}m, inside=$isInside, timeActive=$isTimeActive, wasInside=$wasInside")

            // 진입 감지
            if (canEnter && !wasInside) {
                // 30초 락 체크
                val lastLock = entryLocks[id] ?: 0
                if (now - lastLock < ENTRY_LOCK_TTL_MS) {
                    Log.d(TAG, "Fence[$id] entry locked, skipping")
                    continue
                }

                Log.i(TAG, "🚨 Geofence ENTRY detected: $name")
                entryLocks[id] = now
                locksChanged = true

                // API 호출
                recordGeofenceEntry(id, name) { success ->
                    if (success) {
                        entryState[id] = true
                        saveEntryState(entryState)
                        Log.i(TAG, "✅ Geofence entry recorded: $name")
                    } else {
                        // 실패 시 락 해제
                        entryLocks.remove(id)
                        saveEntryLocks(entryLocks)
                        Log.w(TAG, "❌ Geofence entry failed: $name")
                    }
                }
                stateChanged = true
            }
            // 이탈 감지 (영구 지오펜스만)
            else if (type == 0 && !canEnter && wasInside) {
                Log.i(TAG, "🚪 Geofence EXIT detected: $name")
                entryState.remove(id)
                stateChanged = true
            }
        }

        if (stateChanged) saveEntryState(entryState)
        if (locksChanged) saveEntryLocks(entryLocks)
    }

    /**
     * 지오펜스 진입 API 호출
     */
    private fun recordGeofenceEntry(geofenceId: Int, name: String, callback: (Boolean) -> Unit) {
        val prefs = getSharedPreferences(BackgroundLocationModule.PREFS_NAME, Context.MODE_PRIVATE)
        val baseUrl = prefs.getString(BackgroundLocationModule.KEY_BASE_URL, null)
        val apiKey = prefs.getString(BackgroundLocationModule.KEY_API_KEY, null)

        if (baseUrl == null || apiKey == null) {
            Log.e(TAG, "Missing baseUrl or apiKey for geofence entry")
            callback(false)
            return
        }

        executor.execute {
            try {
                val url = URL("${baseUrl.trimEnd('/')}/geofence/userFenceIn")
                val conn = (url.openConnection() as HttpURLConnection).apply {
                    requestMethod = "POST"
                    doOutput = true
                    connectTimeout = 30000
                    readTimeout = 30000
                    setRequestProperty("Content-Type", "application/json")
                    setRequestProperty("X-API-Key", apiKey)
                }

                val payload = JSONObject().apply {
                    put("geofenceId", geofenceId)
                }

                OutputStreamWriter(conn.outputStream).use { writer ->
                    writer.write(payload.toString())
                    writer.flush()
                }

                val code = conn.responseCode
                conn.disconnect()

                val success = code in 200..299
                Log.i(TAG, "Geofence entry API call. code=$code, success=$success")

                if (success) {
                    // 진입 알림 발송
                    sendGeofenceNotification(name)
                }

                // 메인 스레드에서 콜백 호출
                android.os.Handler(Looper.getMainLooper()).post {
                    callback(success)
                }
            } catch (e: Exception) {
                Log.e(TAG, "Failed to record geofence entry", e)
                android.os.Handler(Looper.getMainLooper()).post {
                    callback(false)
                }
            }
        }
    }

    /**
     * 지오펜스 진입 알림 발송
     */
    private fun sendGeofenceNotification(fenceName: String) {
        val channelId = "safetyfence_geofence"

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val channel = NotificationChannel(
                channelId,
                "지오펜스 알림",
                NotificationManager.IMPORTANCE_HIGH
            ).apply {
                description = "안전구역 진입/이탈 알림"
                enableVibration(true)
            }
            val manager = getSystemService(NotificationManager::class.java)
            manager.createNotificationChannel(channel)
        }

        // 앱 열기 인텐트
        val intent = packageManager.getLaunchIntentForPackage(packageName)
        val pendingIntent = PendingIntent.getActivity(
            this, 0, intent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )

        val notification = Notification.Builder(this, channelId)
            .setContentTitle("안전구역 도착")
            .setContentText("$fenceName 에 도착했습니다")
            .setSmallIcon(android.R.drawable.ic_dialog_map)
            .setAutoCancel(true)
            .setContentIntent(pendingIntent)
            .build()

        val manager = getSystemService(NotificationManager::class.java)
        manager.notify(GEOFENCE_NOTIFICATION_ID + (System.currentTimeMillis() % 1000).toInt(), notification)

        Log.i(TAG, "📢 Geofence notification sent: $fenceName")
    }

    // ==================== 서비스 알림 ====================

    private fun buildNotification(): Notification {
        val channelId = "safetyfence_location"
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val channel = NotificationChannel(
                channelId,
                "SafetyFence 위치 추적",
                NotificationManager.IMPORTANCE_MIN
            )
            val manager = getSystemService(NotificationManager::class.java)
            manager.createNotificationChannel(channel)
        }

        val builder = Notification.Builder(this, channelId)
            .setContentTitle("SafetyFence 위치 추적")
            .setContentText("백그라운드 위치 전송 중")
            .setSmallIcon(android.R.drawable.ic_menu_mylocation)
            .setOngoing(true)

        return builder.build()
    }
}
