package com.paypass.safetyfence.location

import android.content.Context
import android.content.Intent
import androidx.core.content.ContextCompat
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.bridge.ReadableMap

class BackgroundLocationModule(private val reactContext: ReactApplicationContext) :
    ReactContextBaseJavaModule(reactContext) {

    override fun getName(): String = "BackgroundLocation"

    @ReactMethod
    fun start(options: ReadableMap, promise: Promise) {
        try {
            val baseUrl = options.getString("baseUrl") ?: ""
            val apiKey = options.getString("apiKey") ?: ""
            val userNumber = options.getString("userNumber") ?: ""
            val geofenceCache = if (options.hasKey("geofenceCache")) options.getString("geofenceCache") else null

            val prefs = reactContext.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
            val editor = prefs.edit()
                .putString(KEY_BASE_URL, baseUrl)
                .putString(KEY_API_KEY, apiKey)
                .putString(KEY_USER_NUMBER, userNumber)

            // 지오펜스 캐시 저장 (있을 경우)
            if (!geofenceCache.isNullOrEmpty()) {
                editor.putString(KEY_GEOFENCE_CACHE, geofenceCache)
            }
            editor.apply()

            val intent = Intent(reactContext, BackgroundLocationService::class.java)
            intent.action = BackgroundLocationService.ACTION_START
            ContextCompat.startForegroundService(reactContext, intent)

            promise.resolve(true)
        } catch (e: Exception) {
            promise.reject("START_FAILED", e.message, e)
        }
    }

    @ReactMethod
    fun stop(promise: Promise) {
        try {
            val intent = Intent(reactContext, BackgroundLocationService::class.java)
            intent.action = BackgroundLocationService.ACTION_STOP
            reactContext.startService(intent)
            promise.resolve(true)
        } catch (e: Exception) {
            promise.reject("STOP_FAILED", e.message, e)
        }
    }

    /**
     * 지오펜스 캐시 업데이트 (서비스 실행 중 캐시 갱신용)
     */
    @ReactMethod
    fun updateGeofenceCache(geofenceCache: String?, promise: Promise) {
        try {
            val prefs = reactContext.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
            if (geofenceCache.isNullOrEmpty()) {
                prefs.edit().remove(KEY_GEOFENCE_CACHE).apply()
            } else {
                prefs.edit().putString(KEY_GEOFENCE_CACHE, geofenceCache).apply()
            }
            promise.resolve(true)
        } catch (e: Exception) {
            promise.reject("UPDATE_CACHE_FAILED", e.message, e)
        }
    }

    /**
     * 지오펜스 진입 상태 가져오기 (JS-Kotlin 동기화용)
     */
    @ReactMethod
    fun getEntryState(promise: Promise) {
        try {
            val prefs = reactContext.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
            val stateStr = prefs.getString(KEY_GEOFENCE_ENTRY_STATE, "{}") ?: "{}"
            promise.resolve(stateStr)
        } catch (e: Exception) {
            promise.reject("GET_ENTRY_STATE_FAILED", e.message, e)
        }
    }

    /**
     * 지오펜스 진입 상태 저장 (JS-Kotlin 동기화용)
     */
    @ReactMethod
    fun setEntryState(stateJson: String?, promise: Promise) {
        try {
            val prefs = reactContext.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
            prefs.edit().putString(KEY_GEOFENCE_ENTRY_STATE, stateJson ?: "{}").apply()
            promise.resolve(true)
        } catch (e: Exception) {
            promise.reject("SET_ENTRY_STATE_FAILED", e.message, e)
        }
    }

    /**
     * 지오펜스 진입 락 가져오기 (JS-Kotlin 동기화용)
     */
    @ReactMethod
    fun getEntryLocks(promise: Promise) {
        try {
            val prefs = reactContext.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
            val locksStr = prefs.getString(KEY_GEOFENCE_ENTRY_LOCKS, "{}") ?: "{}"
            promise.resolve(locksStr)
        } catch (e: Exception) {
            promise.reject("GET_ENTRY_LOCKS_FAILED", e.message, e)
        }
    }

    /**
     * 지오펜스 진입 락 저장 (JS-Kotlin 동기화용)
     */
    @ReactMethod
    fun setEntryLocks(locksJson: String?, promise: Promise) {
        try {
            val prefs = reactContext.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
            prefs.edit().putString(KEY_GEOFENCE_ENTRY_LOCKS, locksJson ?: "{}").apply()
            promise.resolve(true)
        } catch (e: Exception) {
            promise.reject("SET_ENTRY_LOCKS_FAILED", e.message, e)
        }
    }

    companion object {
        const val PREFS_NAME = "safetyfence_bg_location"
        const val KEY_BASE_URL = "baseUrl"
        const val KEY_API_KEY = "apiKey"
        const val KEY_USER_NUMBER = "userNumber"
        const val KEY_GEOFENCE_CACHE = "geofenceCache"
        const val KEY_GEOFENCE_ENTRY_STATE = "geofenceEntryState"
        const val KEY_GEOFENCE_ENTRY_LOCKS = "geofenceEntryLocks"
    }
}
