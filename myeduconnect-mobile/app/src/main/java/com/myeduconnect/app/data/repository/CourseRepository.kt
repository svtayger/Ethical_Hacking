package com.myeduconnect.app.data.repository

import com.myeduconnect.app.data.api.ApiClient
import com.myeduconnect.app.data.model.Course
import com.myeduconnect.app.data.model.MessageResponse
import com.myeduconnect.app.data.model.Review

class CourseRepository {
    private val api = ApiClient.apiService

    suspend fun searchCourses(query: String = ""): List<Course> {
        return api.searchCourses(query)
    }

    suspend fun getMyCourses(userId: Int): List<Course> {
        return api.getMyCourses(userId)
    }

    suspend fun enroll(userId: Int, courseId: Int, amount: Double): MessageResponse {
        return api.enroll(userId, courseId, amount)
    }

    suspend fun upgradePremium(userId: Int, amount: Double): MessageResponse {
        return api.upgradePremium(userId, amount)
    }

    suspend fun getReviews(courseId: Int): List<Review> {
        return api.getReviews(courseId)
    }

    suspend fun postReview(courseId: Int, userId: Int, content: String): MessageResponse {
        return api.postReview(courseId, userId, content)
    }
}
