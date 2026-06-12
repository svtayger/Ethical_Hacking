package com.myeduconnect.app.data.repository

import com.myeduconnect.app.data.api.ApiClient
import com.myeduconnect.app.data.model.MessageResponse
import com.myeduconnect.app.data.model.User

class UserRepository {
    private val api = ApiClient.apiService

    suspend fun getProfile(userId: Int): User {
        return api.getProfile(userId)
    }

    suspend fun updateProfile(userId: Int, fullName: String, email: String): MessageResponse {
        return api.updateProfile(userId, fullName, email)
    }
}
