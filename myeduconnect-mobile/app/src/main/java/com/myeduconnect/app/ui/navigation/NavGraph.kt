package com.myeduconnect.app.ui.navigation

import androidx.compose.runtime.Composable
import androidx.navigation.NavHostController
import androidx.navigation.NavType
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.navArgument
import com.myeduconnect.app.ui.screens.*
import com.myeduconnect.app.ui.viewmodel.AuthViewModel
import com.myeduconnect.app.ui.viewmodel.CourseViewModel
import com.myeduconnect.app.ui.viewmodel.ProfileViewModel

object Routes {
    const val LOGIN = "login"
    const val REGISTER = "register"
    const val HOME = "home"
    const val COURSES = "courses"
    const val COURSE_DETAIL = "course_detail/{courseId}/{courseTitle}"
    const val MY_COURSES = "my_courses"
    const val PROFILE = "profile"

    fun courseDetail(courseId: Int, courseTitle: String) =
        "course_detail/$courseId/$courseTitle"
}

@Composable
fun NavGraph(
    navController: NavHostController,
    authViewModel: AuthViewModel,
    courseViewModel: CourseViewModel,
    profileViewModel: ProfileViewModel,
    startDestination: String
) {
    NavHost(navController = navController, startDestination = startDestination) {
        composable(Routes.LOGIN) {
            LoginScreen(
                authViewModel = authViewModel,
                onNavigateToRegister = { navController.navigate(Routes.REGISTER) },
                onLoginSuccess = {
                    navController.navigate(Routes.HOME) {
                        popUpTo(Routes.LOGIN) { inclusive = true }
                    }
                }
            )
        }

        composable(Routes.REGISTER) {
            RegisterScreen(
                authViewModel = authViewModel,
                onNavigateToLogin = { navController.popBackStack() },
                onRegisterSuccess = {
                    navController.navigate(Routes.LOGIN) {
                        popUpTo(Routes.REGISTER) { inclusive = true }
                    }
                }
            )
        }

        composable(Routes.HOME) {
            HomeScreen(
                authViewModel = authViewModel,
                onNavigateToCourses = { navController.navigate(Routes.COURSES) },
                onNavigateToMyCourses = { navController.navigate(Routes.MY_COURSES) },
                onNavigateToProfile = { navController.navigate(Routes.PROFILE) },
                onLogout = {
                    authViewModel.logout()
                    navController.navigate(Routes.LOGIN) {
                        popUpTo(0) { inclusive = true }
                    }
                }
            )
        }

        composable(Routes.COURSES) {
            CoursesScreen(
                courseViewModel = courseViewModel,
                onCourseClick = { course ->
                    navController.navigate(Routes.courseDetail(course.id, course.title))
                },
                onBack = { navController.popBackStack() }
            )
        }

        composable(
            route = Routes.COURSE_DETAIL,
            arguments = listOf(
                navArgument("courseId") { type = NavType.IntType },
                navArgument("courseTitle") { type = NavType.StringType }
            )
        ) { backStackEntry ->
            val courseId = backStackEntry.arguments?.getInt("courseId") ?: 0
            val courseTitle = backStackEntry.arguments?.getString("courseTitle") ?: ""
            CourseDetailScreen(
                courseId = courseId,
                courseTitle = courseTitle,
                authViewModel = authViewModel,
                courseViewModel = courseViewModel,
                onBack = { navController.popBackStack() }
            )
        }

        composable(Routes.MY_COURSES) {
            MyCoursesScreen(
                courseViewModel = courseViewModel,
                authViewModel = authViewModel,
                onBack = { navController.popBackStack() }
            )
        }

        composable(Routes.PROFILE) {
            ProfileScreen(
                profileViewModel = profileViewModel,
                onBack = { navController.popBackStack() }
            )
        }
    }
}
