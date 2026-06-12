package com.myeduconnect.app.ui.viewmodel

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.myeduconnect.app.data.model.Course
import com.myeduconnect.app.data.model.Review
import com.myeduconnect.app.data.repository.CourseRepository
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.launch

data class CourseUiState(
    val isLoading: Boolean = false,
    val courses: List<Course> = emptyList(),
    val myCourses: List<Course> = emptyList(),
    val reviews: List<Review> = emptyList(),
    val searchQuery: String = "",
    val error: String? = null,
    val successMessage: String? = null
)

class CourseViewModel : ViewModel() {
    private val repository = CourseRepository()

    private val _uiState = MutableStateFlow(CourseUiState())
    val uiState: StateFlow<CourseUiState> = _uiState

    fun searchCourses(query: String = "") {
        viewModelScope.launch {
            _uiState.value = _uiState.value.copy(isLoading = true, error = null, searchQuery = query)
            try {
                val results = repository.searchCourses(query)
                _uiState.value = _uiState.value.copy(isLoading = false, courses = results)
            } catch (e: Exception) {
                _uiState.value = _uiState.value.copy(
                    isLoading = false,
                    error = e.message ?: "Failed to load courses"
                )
            }
        }
    }

    fun loadMyCourses(userId: Int) {
        viewModelScope.launch {
            _uiState.value = _uiState.value.copy(isLoading = true, error = null)
            try {
                val results = repository.getMyCourses(userId)
                _uiState.value = _uiState.value.copy(isLoading = false, myCourses = results)
            } catch (e: Exception) {
                _uiState.value = _uiState.value.copy(
                    isLoading = false,
                    error = e.message ?: "Failed to load your courses"
                )
            }
        }
    }

    fun enroll(userId: Int, courseId: Int, amount: Double) {
        viewModelScope.launch {
            _uiState.value = _uiState.value.copy(isLoading = true, error = null)
            try {
                val response = repository.enroll(userId, courseId, amount)
                _uiState.value = _uiState.value.copy(
                    isLoading = false,
                    successMessage = response.message
                )
            } catch (e: Exception) {
                _uiState.value = _uiState.value.copy(
                    isLoading = false,
                    error = e.message ?: "Enrollment failed"
                )
            }
        }
    }

    fun upgradePremium(userId: Int, amount: Double) {
        viewModelScope.launch {
            _uiState.value = _uiState.value.copy(isLoading = true, error = null)
            try {
                val response = repository.upgradePremium(userId, amount)
                _uiState.value = _uiState.value.copy(
                    isLoading = false,
                    successMessage = response.message
                )
            } catch (e: Exception) {
                _uiState.value = _uiState.value.copy(
                    isLoading = false,
                    error = e.message ?: "Upgrade failed"
                )
            }
        }
    }

    fun loadReviews(courseId: Int) {
        viewModelScope.launch {
            _uiState.value = _uiState.value.copy(isLoading = true, error = null)
            try {
                val results = repository.getReviews(courseId)
                _uiState.value = _uiState.value.copy(isLoading = false, reviews = results)
            } catch (e: Exception) {
                _uiState.value = _uiState.value.copy(
                    isLoading = false,
                    error = e.message ?: "Failed to load reviews"
                )
            }
        }
    }

    fun postReview(courseId: Int, userId: Int, content: String) {
        viewModelScope.launch {
            _uiState.value = _uiState.value.copy(isLoading = true, error = null)
            try {
                val response = repository.postReview(courseId, userId, content)
                loadReviews(courseId)
                _uiState.value = _uiState.value.copy(
                    isLoading = false,
                    successMessage = response.message
                )
            } catch (e: Exception) {
                _uiState.value = _uiState.value.copy(
                    isLoading = false,
                    error = e.message ?: "Failed to post review"
                )
            }
        }
    }

    fun clearMessages() {
        _uiState.value = _uiState.value.copy(error = null, successMessage = null)
    }
}
