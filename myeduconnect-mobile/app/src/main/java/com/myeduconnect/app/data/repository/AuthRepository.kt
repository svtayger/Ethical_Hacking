package com.myeduconnect.app.data.repository

import com.myeduconnect.app.data.api.ApiClient
import com.myeduconnect.app.data.model.LoginResponse
import com.myeduconnect.app.data.model.MessageResponse

class AuthRepository {
    private val api = ApiClient.apiService

    suspend fun login(username: String, password: String): LoginResponse {
        return api.login(username, password)
    }

    suspend fun register(username: String, password: String, fullName: String, email: String): MessageResponse {
        return api.register(username, password, fullName, email)
    }
}
