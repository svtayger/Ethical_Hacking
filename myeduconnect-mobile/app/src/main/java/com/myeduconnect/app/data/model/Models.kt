package com.myeduconnect.app.data.model

data class LoginRequest(
    val username: String,
    val password: String
)

data class RegisterRequest(
    val username: String,
    val password: String,
    val full_name: String,
    val email: String
)

data class LoginResponse(
    val message: String,
    val user_id: Int,
    val role: String,
    val username: String,
    val token: String
)

data class User(
    val id: Int,
    val username: String,
    val full_name: String?,
    val email: String?,
    val role: String?,
    val is_premium: Int? = 0
)

data class Course(
    val id: Int,
    val title: String,
    val description: String?,
    val price: Double?
)

data class Review(
    val id: Int,
    val course_id: Int,
    val user_id: Int,
    val username: String?,
    val content: String?
)

data class MessageResponse(
    val message: String
)

data class Stats(
    val total_users: Int,
    val total_enrollments: Int
)
