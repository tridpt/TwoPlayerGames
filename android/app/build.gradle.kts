import org.gradle.api.tasks.Sync

plugins {
    id("com.android.application")
}

// Use the same checked-in web files as the browser app, without maintaining a copy.
val syncWebAssets by tasks.registering(Sync::class) {
    from(rootProject.projectDir.parentFile) {
        include("index.html", "styles.css", "icon.svg", "manifest.webmanifest", "offline.html")
        include("js/**/*.js")
    }
    into(layout.buildDirectory.dir("generated/web-assets/www"))
}

android {
    namespace = "com.twoplayergames.app"
    compileSdk = 35

    defaultConfig {
        applicationId = "com.twoplayergames.app"
        minSdk = 24
        targetSdk = 35
        versionCode = 1
        versionName = "1.1.0"
    }

    sourceSets["main"].assets.srcDir(layout.buildDirectory.dir("generated/web-assets"))

    buildTypes {
        release {
            isMinifyEnabled = false
        }
    }

    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }
}

tasks.named("preBuild") {
    dependsOn(syncWebAssets)
}
