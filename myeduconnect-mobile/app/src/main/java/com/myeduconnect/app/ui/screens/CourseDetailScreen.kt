package com.myeduconnect.app.ui.screens

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.text.KeyboardActions
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.ArrowBack
import androidx.compose.material.icons.filled.Send
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.ImeAction
import androidx.compose.ui.unit.dp
import com.myeduconnect.app.ui.viewmodel.AuthViewModel
import com.myeduconnect.app.ui.viewmodel.CourseViewModel

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun CourseDetailScreen(
    courseId: Int,
    courseTitle: String,
    authViewModel: AuthViewModel,
    courseViewModel: CourseViewModel,
    onBack: () -> Unit
) {
    val courseState by courseViewModel.uiState.collectAsState()
    val session = authViewModel.session

    var reviewContent by remember { mutableStateOf("") }
    var enrollAmount by remember { mutableStateOf("49.99") }

    LaunchedEffect(courseId) {
        courseViewModel.loadReviews(courseId)
    }

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text(courseTitle) },
                navigationIcon = {
                    IconButton(onClick = onBack) {
                        Icon(Icons.Default.ArrowBack, contentDescription = "Back")
                    }
                }
            )
        }
    ) { padding ->
        LazyColumn(
            modifier = Modifier
                .fillMaxSize()
                .padding(padding)
                .padding(16.dp),
            verticalArrangement = Arrangement.spacedBy(16.dp)
        ) {
            item {
                Card(
                    modifier = Modifier.fillMaxWidth(),
                    elevation = CardDefaults.cardElevation(defaultElevation = 2.dp)
                ) {
                    Column(modifier = Modifier.padding(16.dp)) {
                        Text(
                            text = courseTitle,
                            style = MaterialTheme.typography.headlineMedium,
                            fontWeight = FontWeight.Bold
                        )
                        Spacer(modifier = Modifier.height(8.dp))
                        Text(
                            text = "Course ID: $courseId",
                            style = MaterialTheme.typography.bodyMedium,
                            color = MaterialTheme.colorScheme.onSurfaceVariant
                        )

                        Spacer(modifier = Modifier.height(16.dp))

                        OutlinedTextField(
                            value = enrollAmount,
                            onValueChange = { enrollAmount = it },
                            label = { Text("Enrollment Amount (\$)") },
                            singleLine = true,
                            modifier = Modifier.fillMaxWidth(),
                            keyboardOptions = KeyboardOptions(imeAction = ImeAction.Done)
                        )

                        Spacer(modifier = Modifier.height(12.dp))

                        Button(
                            onClick = {
                                val amount = enrollAmount.toDoubleOrNull() ?: 49.99
                                courseViewModel.enroll(session.userId, courseId, amount)
                            },
                            modifier = Modifier.fillMaxWidth(),
                            enabled = !courseState.isLoading
                        ) {
                            Text("Enroll Now")
                        }
                    }
                }
            }

            if (courseState.successMessage != null) {
                item {
                    Card(
                        colors = CardDefaults.cardColors(
                            containerColor = MaterialTheme.colorScheme.secondary
                        )
                    ) {
                        Text(
                            text = courseState.successMessage!!,
                            modifier = Modifier.padding(16.dp),
                            color = MaterialTheme.colorScheme.onPrimary
                        )
                    }
                }
            }

            if (courseState.error != null) {
                item {
                    Card(
                        colors = CardDefaults.cardColors(
                            containerColor = MaterialTheme.colorScheme.error
                        )
                    ) {
                        Text(
                            text = courseState.error!!,
                            modifier = Modifier.padding(16.dp),
                            color = MaterialTheme.colorScheme.onPrimary
                        )
                    }
                }
            }

            item {
                Text(
                    text = "Reviews",
                    style = MaterialTheme.typography.titleLarge,
                    fontWeight = FontWeight.SemiBold
                )
            }

            item {
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    OutlinedTextField(
                        value = reviewContent,
                        onValueChange = { reviewContent = it },
                        placeholder = { Text("Write a review…") },
                        modifier = Modifier.weight(1f),
                        singleLine = true,
                        keyboardOptions = KeyboardOptions(imeAction = ImeAction.Done),
                        keyboardActions = KeyboardActions(
                            onDone = {
                                if (reviewContent.isNotBlank()) {
                                    courseViewModel.postReview(courseId, session.userId, reviewContent)
                                    reviewContent = ""
                                }
                            }
                        )
                    )
                    Spacer(modifier = Modifier.width(8.dp))
                    IconButton(
                        onClick = {
                            if (reviewContent.isNotBlank()) {
                                courseViewModel.postReview(courseId, session.userId, reviewContent)
                                reviewContent = ""
                            }
                        }
                    ) {
                        Icon(Icons.Default.Send, contentDescription = "Send review")
                    }
                }
            }

            if (courseState.reviews.isEmpty()) {
                item {
                    Text(
                        text = "No reviews yet. Be the first!",
                        style = MaterialTheme.typography.bodyMedium,
                        color = MaterialTheme.colorScheme.onSurfaceVariant
                    )
                }
            } else {
                items(courseState.reviews) { review ->
                    Card(
                        modifier = Modifier.fillMaxWidth(),
                        colors = CardDefaults.cardColors(
                            containerColor = MaterialTheme.colorScheme.surfaceVariant
                        )
                    ) {
                        Column(modifier = Modifier.padding(12.dp)) {
                            Text(
                                text = review.username ?: "Anonymous",
                                style = MaterialTheme.typography.labelLarge,
                                fontWeight = FontWeight.SemiBold
                            )
                            Spacer(modifier = Modifier.height(4.dp))
                            Text(
                                text = review.content ?: "",
                                style = MaterialTheme.typography.bodyMedium
                            )
                        }
                    }
                }
            }
        }
    }
}
