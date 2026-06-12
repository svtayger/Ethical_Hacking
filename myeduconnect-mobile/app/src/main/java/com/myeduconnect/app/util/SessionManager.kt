package com.myeduconnect.app.util

import android.content.Context
import android.content.SharedPreferences

class SessionManager(context: Context) {
    private val prefs: SharedPreferences = context.getSharedPreferences("myeduconnect_prefs", Context.MODE_PRIVATE)

    var userId: Int
        get() = prefs.getInt("user_id", -1)
        set(value) = prefs.edit().putInt("user_id", value).apply()

    var username: String
        get() = prefs.getString("username", "") ?: ""
        set(value) = prefs.edit().putString("username", value).apply()

    var token: String
        get() = prefs.getString("token", "") ?: ""
        set(value) = prefs.edit().putString("token", value).apply()

    var role: String
        get() = prefs.getString("role", "") ?: ""
        set(value) = prefs.edit().putString("role", value).apply()

    val isLoggedIn: Boolean
        get() = userId != -1

    fun clear() {
        prefs.edit().clear().apply()
    }
}
