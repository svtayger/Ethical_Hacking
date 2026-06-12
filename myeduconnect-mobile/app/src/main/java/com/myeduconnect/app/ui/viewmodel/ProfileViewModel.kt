package com.myeduconnect.app.ui.viewmodel

import android.app.Application
import androidx.lifecycle.AndroidViewModel
import androidx.lifecycle.viewModelScope
import com.myeduconnect.app.data.model.User
import com.myeduconnect.app.data.repository.UserRepository
import com.myeduconnect.app.util.SessionManager
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.launch

data class ProfileUiState(
    val isLoading: Boolean = false,
    val user: User? = null,
    val error: String? = null,
    val successMessage: String? = null
)

class ProfileViewModel(application: Application) : AndroidViewModel(application) {
    private val repository = UserRepository()
    private val session = SessionManager(application)

    private val _uiState = MutableStateFlow(ProfileUiState())
    val uiState: StateFlow<ProfileUiState> = _uiState

    fun loadProfile() {
        val userId = session.userId
        if (userId == -1) return

        viewModelScope.launch {
            _uiState.value = _uiState.value.copy(isLoading = true, error = null)
            try {
                val user = repository.getProfile(userId)
                _uiState.value = _uiState.value.copy(isLoading = false, user = user)
            } catch (e: Exception) {
                _uiState.value = _uiState.value.copy(
                    isLoading = false,
                    error = e.message ?: "Failed to load profile"
                )
            }
        }
    }

    fun updateProfile(fullName: String, email: String) {
        val userId = session.userId
        if (userId == -1) return

        viewModelScope.launch {
            _uiState.value = _uiState.value.copy(isLoading = true, error = null)
            try {
                repository.updateProfile(userId, fullName, email)
                loadProfile()
                _uiState.value = _uiState.value.copy(
                    isLoading = false,
                    successMessage = "Profile updated"
                )
            } catch (e: Exception) {
                _uiState.value = _uiState.value.copy(
                    isLoading = false,
                    error = e.message ?: "Failed to update profile"
                )
            }
        }
    }

    fun clearMessages() {
        _uiState.value = _uiState.value.copy(error = null, successMessage = null)
    }
}
