import java.io.FileInputStream
import java.util.Properties

plugins {
    id("com.android.application")
    id("kotlin-android")
    // The Flutter Gradle Plugin must be applied after the Android and Kotlin Gradle plugins.
    id("dev.flutter.flutter-gradle-plugin")
}

// ✅ FASE 0 (FCM): Aplicar Google Services automáticamente apenas exista google-services.json
// sin romper compilaciones locales/CI mientras el archivo de proyecto Firebase aún no está presente.
if (file("google-services.json").exists()) {
    apply(plugin = "com.google.gms.google-services")
}

// ✅ 24-OCT-2026: Firma release estable y persistente.
// key.properties vive en android/ y está excluido de Git junto con key.jks.
// Si no existe (por ejemplo en otro equipo), se usa debug como fallback para
// no bloquear compilaciones locales.
val keystorePropertiesFile = rootProject.file("key.properties")
val hasReleaseKeystore = keystorePropertiesFile.exists()
val keystoreProperties = Properties()
if (hasReleaseKeystore) {
    keystoreProperties.load(FileInputStream(keystorePropertiesFile))
}

val whiteLabelAppId: String =
    (project.findProperty("APP_APPLICATION_ID") as String?)?.trim()?.takeIf { it.isNotEmpty }
        ?: "com.mekanos.mekanos_mobile"
val whiteLabelAppName: String =
    (project.findProperty("APP_NAME") as String?)?.trim()?.takeIf { it.isNotEmpty }
        ?: "EAM Técnicos"

android {
    namespace = "com.mekanos.mekanos_mobile"
    compileSdk = flutter.compileSdkVersion
    ndkVersion = flutter.ndkVersion

    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }

    kotlinOptions {
        jvmTarget = JavaVersion.VERSION_17.toString()
    }

    defaultConfig {
        applicationId = whiteLabelAppId
        manifestPlaceholders["appName"] = whiteLabelAppName
        minSdk = flutter.minSdkVersion
        targetSdk = flutter.targetSdkVersion
        versionCode = flutter.versionCode
        versionName = flutter.versionName
    }

    signingConfigs {
        if (hasReleaseKeystore) {
            create("release") {
                keyAlias = keystoreProperties["keyAlias"] as String
                keyPassword = keystoreProperties["keyPassword"] as String
                storeFile = file(keystoreProperties["storeFile"] as String)
                storePassword = keystoreProperties["storePassword"] as String
            }
        }
    }

    buildTypes {
        release {
            // ✅ PRODUCCIÓN: Configuración de release optimizada
            // Minificación de código con R8
            isMinifyEnabled = true
            // Reducir tamaño de recursos
            isShrinkResources = true
            // ProGuard rules
            proguardFiles(
                getDefaultProguardFile("proguard-android-optimize.txt"),
                "proguard-rules.pro"
            )
            // ✅ Firma release propia; fallback a debug solo si no hay keystore.
            signingConfig = if (hasReleaseKeystore) {
                signingConfigs.getByName("release")
            } else {
                signingConfigs.getByName("debug")
            }
            
            // Configuración NDK para mejor rendimiento
            ndk {
                debugSymbolLevel = "FULL"
            }
        }
        
        debug {
            // Debug: sin minificación para desarrollo rápido
            isMinifyEnabled = false
            isShrinkResources = false
        }
    }
    
    // Configuración de empaquetado
    packaging {
        resources {
            excludes += listOf(
                "META-INF/DEPENDENCIES",
                "META-INF/LICENSE",
                "META-INF/LICENSE.txt",
                "META-INF/NOTICE",
                "META-INF/NOTICE.txt"
            )
        }
    }
}

flutter {
    source = "../.."
}
