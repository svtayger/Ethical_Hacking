package com.myeduconnect.app.data.api

import com.myeduconnect.app.data.model.*
import retrofit2.http.*

interface ApiService {

    @FormUrlEncoded
    @POST("register")
    suspend fun register(
        @Field("username") username: String,
        @Field("password") password: String,
        @Field("full_name") fullName: String,
        @Field("email") email: String
    ): MessageResponse

    @FormUrlEncoded
    @POST("login")
    suspend fun login(
        @Field("username") username: String,
        @Field("password") password: String
    ): LoginResponse

    @GET("courses/search")
    suspend fun searchCourses(
        @Query("q") query: String = ""
    ): List<Course>

    @GET("profile/{userId}")
    suspend fun getProfile(
        @Path("userId") userId: Int
    ): User

    @FormUrlEncoded
    @PUT("profile/{userId}")
    suspend fun updateProfile(
        @Path("userId") userId: Int,
        @Field("full_name") fullName: String,
        @Field("email") email: String
    ): MessageResponse

    @FormUrlEncoded
    @POST("enroll")
    suspend fun enroll(
        @Field("user_id") userId: Int,
        @Field("course_id") courseId: Int,
        @Field("amount") amount: Double
    ): MessageResponse

    @GET("my-courses/{userId}")
    suspend fun getMyCourses(
        @Path("userId") userId: Int
    ): List<Course>

    @FormUrlEncoded
    @POST("payment/premium")
    suspend fun upgradePremium(
        @Field("user_id") userId: Int,
        @Field("amount") amount: Double
    ): MessageResponse

    @FormUrlEncoded
    @POST("courses/{courseId}/reviews")
    suspend fun postReview(
        @Path("courseId") courseId: Int,
        @Field("user_id") userId: Int,
        @Field("content") content: String
    ): MessageResponse

    @GET("courses/{courseId}/reviews")
    suspend fun getReviews(
        @Path("courseId") courseId: Int
    ): List<Review>
}
