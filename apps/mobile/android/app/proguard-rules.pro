# ============================================
# MEKANOS MOBILE - PROGUARD RULES PARA RELEASE
# ============================================

# Flutter wrapper
-keep class io.flutter.app.** { *; }
-keep class io.flutter.plugin.** { *; }
-keep class io.flutter.util.** { *; }
-keep class io.flutter.view.** { *; }
-keep class io.flutter.** { *; }
-keep class io.flutter.plugins.** { *; }

# Mantener clases de Dart
-keep class io.flutter.embedding.** { *; }

# Supabase/Realtime
-keep class io.supabase.** { *; }
-keep class com.google.gson.** { *; }
-keep class org.json.** { *; }

# OkHttp (usado por varios plugins)
-dontwarn okhttp3.**
-dontwarn okio.**
-keep class okhttp3.** { *; }
-keep interface okhttp3.** { *; }

# Retrofit (si se usa)
-dontwarn retrofit2.**
-keep class retrofit2.** { *; }

# Mantener modelos de datos (para serialización JSON)
-keepclassmembers class * {
    @com.google.gson.annotations.SerializedName <fields>;
}

# SQLite/Drift
-keep class com.example.** { *; }
-keep class **.database.** { *; }

# Flutter Secure Storage
-keep class com.it_nomads.fluttersecurestorage.** { *; }

# Syncfusion (Signature Pad)
-keep class com.syncfusion.** { *; }

# Mantener enums
-keepclassmembers enum * {
    public static **[] values();
    public static ** valueOf(java.lang.String);
}

# Mantener Parcelables
-keepclassmembers class * implements android.os.Parcelable {
    public static final android.os.Parcelable$Creator *;
}

# Mantener Serializables
-keepclassmembers class * implements java.io.Serializable {
    static final long serialVersionUID;
    private static final java.io.ObjectStreamField[] serialPersistentFields;
    private void writeObject(java.io.ObjectOutputStream);
    private void readObject(java.io.ObjectInputStream);
    java.lang.Object writeReplace();
    java.lang.Object readResolve();
}

# No ofuscar excepciones
-keep public class * extends java.lang.Exception

# Mantener anotaciones
-keepattributes *Annotation*
-keepattributes Signature
-keepattributes InnerClasses
-keepattributes EnclosingMethod

# Optimizaciones
-optimizationpasses 5
-dontusemixedcaseclassnames
-verbose

# Suprimir warnings conocidos
-dontwarn javax.annotation.**
-dontwarn sun.misc.Unsafe

# ✅ FIX CRÍTICO: Google Play Core (deferred components) - no usado en esta app
-dontwarn com.google.android.play.core.**
-keep class com.google.android.play.core.** { *; }
