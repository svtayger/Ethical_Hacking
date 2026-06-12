package com.myeduconnect.app

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Surface
import androidx.compose.ui.Modifier
import androidx.lifecycle.viewmodel.compose.viewModel
import androidx.navigation.compose.rememberNavController
import com.myeduconnect.app.ui.navigation.NavGraph
import com.myeduconnect.app.ui.navigation.Routes
import com.myeduconnect.app.ui.theme.MyEduConnectTheme
import com.myeduconnect.app.ui.viewmodel.AuthViewModel
import com.myeduconnect.app.ui.viewmodel.CourseViewModel
import com.myeduconnect.app.ui.viewmodel.ProfileViewModel

class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        enableEdgeToEdge()
        setContent {
            MyEduConnectTheme {
                Surface(
                    modifier = Modifier.fillMaxSize(),
                    color = MaterialTheme.colorScheme.background
                ) {
                    val navController = rememberNavController()
                    val authViewModel: AuthViewModel = viewModel()
                    val courseViewModel: CourseViewModel = viewModel()
                    val profileViewModel: ProfileViewModel = viewModel()

                    val startDestination = if (authViewModel.session.isLoggedIn) {
                        Routes.HOME
                    } else {
                        Routes.LOGIN
                    }

                    NavGraph(
                        navController = navController,
                        authViewModel = authViewModel,
                        courseViewModel = courseViewModel,
                        profileViewModel = profileViewModel,
                        startDestination = startDestination
                    )
                }
            }
        }
    }
}
