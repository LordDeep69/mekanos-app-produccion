/// Pantalla de Login
///
/// PRINCIPIO: Simple pero funcional. Sin diseño elaborado hasta que funcione.
library;

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/config/app_config.dart';
import '../../../core/config/branding_provider.dart';
import '../../../core/config/environment.dart';
import '../../../core/storage/secure_storage.dart';
import '../data/auth_provider.dart';
import 'server_selector_sheet.dart';

class LoginScreen extends ConsumerStatefulWidget {
  const LoginScreen({super.key});

  @override
  ConsumerState<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends ConsumerState<LoginScreen> {
  final _emailController = TextEditingController();
  final _passwordController = TextEditingController();
  final _formKey = GlobalKey<FormState>();
  bool _obscurePassword = true;

  @override
  void initState() {
    super.initState();
    // Los campos se inician vacíos por seguridad
  }

  @override
  void dispose() {
    _emailController.dispose();
    _passwordController.dispose();
    super.dispose();
  }

  Future<void> _handleLogin() async {
    if (!_formKey.currentState!.validate()) return;

    final success = await ref
        .read(authStateProvider.notifier)
        .login(_emailController.text.trim(), _passwordController.text);

    if (success && mounted) {
      // Navegación se maneja en el main.dart según el estado
      debugPrint('✅ Login exitoso - navegación manejada por el estado');
    }
  }

  @override
  Widget build(BuildContext context) {
    final authState = ref.watch(authStateProvider);
    final branding = ref.watch(brandingProvider);
    final logoUrl = branding.logoPrincipalUrl ?? branding.isotipoUrl;

    return Scaffold(
      body: SafeArea(
        child: Center(
          child: SingleChildScrollView(
            padding: const EdgeInsets.all(24.0),
            child: Form(
              key: _formKey,
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  // Logo/Título White-Label
                  if (logoUrl != null && logoUrl.isNotEmpty)
                    SizedBox(
                      height: 80,
                      child: Image.network(
                        logoUrl,
                        fit: BoxFit.contain,
                        errorBuilder: (_, _, _) => Icon(
                          Icons.engineering,
                          size: 80,
                          color: branding.colorPrimario,
                        ),
                      ),
                    )
                  else
                    Icon(
                      Icons.engineering,
                      size: 80,
                      color: branding.colorPrimario,
                    ),
                  const SizedBox(height: 16),
                  Text(
                    branding.nombreComercial,
                    textAlign: TextAlign.center,
                    style: TextStyle(
                      fontSize: 30,
                      fontWeight: FontWeight.bold,
                      color: branding.colorPrimario,
                    ),
                  ),
                  Text(
                    branding.eslogan ?? 'Portal Móvil de Técnicos',
                    textAlign: TextAlign.center,
                    style: const TextStyle(fontSize: 15, color: Colors.grey),
                  ),
                  const SizedBox(height: 44),

                  // Campo Email
                  TextFormField(
                    controller: _emailController,
                    keyboardType: TextInputType.emailAddress,
                    decoration: const InputDecoration(
                      labelText: 'Email',
                      prefixIcon: Icon(Icons.email),
                      border: OutlineInputBorder(),
                    ),
                    validator: (value) {
                      if (value == null || value.isEmpty) {
                        return 'Ingrese su email';
                      }
                      if (!value.contains('@')) {
                        return 'Email inválido';
                      }
                      return null;
                    },
                  ),
                  const SizedBox(height: 16),

                  // Campo Password
                  TextFormField(
                    controller: _passwordController,
                    obscureText: _obscurePassword,
                    decoration: InputDecoration(
                      labelText: 'Contraseña',
                      prefixIcon: const Icon(Icons.lock),
                      border: const OutlineInputBorder(),
                      suffixIcon: IconButton(
                        icon: Icon(
                          _obscurePassword
                              ? Icons.visibility
                              : Icons.visibility_off,
                        ),
                        onPressed: () {
                          setState(() {
                            _obscurePassword = !_obscurePassword;
                          });
                        },
                      ),
                    ),
                    validator: (value) {
                      if (value == null || value.isEmpty) {
                        return 'Ingrese su contraseña';
                      }
                      return null;
                    },
                  ),
                  const SizedBox(height: 24),

                  // Mensaje de error
                  if (authState.hasError && authState.errorMessage != null)
                    Container(
                      padding: const EdgeInsets.all(12),
                      margin: const EdgeInsets.only(bottom: 16),
                      decoration: BoxDecoration(
                        color: Colors.red.shade50,
                        borderRadius: BorderRadius.circular(8),
                        border: Border.all(color: Colors.red.shade200),
                      ),
                      child: Row(
                        children: [
                          const Icon(Icons.error, color: Colors.red),
                          const SizedBox(width: 8),
                          Expanded(
                            child: Text(
                              authState.errorMessage!,
                              style: const TextStyle(color: Colors.red),
                            ),
                          ),
                        ],
                      ),
                    ),

                  // Botón Login
                  SizedBox(
                    height: 50,
                    child: ElevatedButton(
                      onPressed: authState.isLoading ? null : _handleLogin,
                      style: ElevatedButton.styleFrom(
                        backgroundColor: branding.colorPrimario,
                        foregroundColor: Colors.white,
                      ),
                      child: authState.isLoading
                          ? const SizedBox(
                              height: 24,
                              width: 24,
                              child: CircularProgressIndicator(
                                strokeWidth: 2,
                                valueColor: AlwaysStoppedAnimation<Color>(
                                  Colors.white,
                                ),
                              ),
                            )
                          : const Text(
                              'INICIAR SESIÓN',
                              style: TextStyle(
                                fontSize: 16,
                                fontWeight: FontWeight.bold,
                              ),
                            ),
                    ),
                  ),

                  const SizedBox(height: 16),

                  // Pie sutil de conexión (Producción permanente; selector QA solo si habilitado en build)
                  _buildEnvironmentFooter(context, branding),
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildEnvironmentFooter(
    BuildContext context,
    OrgBrandingConfig branding,
  ) {
    final footerContent = ValueListenableBuilder<EnvironmentState>(
      valueListenable: Environment.stateListenable,
      builder: (context, envState, _) {
        if (envState.isProduction) {
          return Container(
            padding: const EdgeInsets.all(12),
            decoration: BoxDecoration(
              color: Colors.grey.shade100,
              borderRadius: BorderRadius.circular(8),
            ),
            child: Text(
              'Conectando a: Servidor ${branding.nombreComercial} (Producción)',
              textAlign: TextAlign.center,
              style: const TextStyle(fontSize: 12, color: Colors.grey),
            ),
          );
        }

        final modeLabel = envState.mode == ApiEnvironmentMode.local
            ? 'Modo Local'
            : 'URL Directa';
        return Container(
          padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
          decoration: BoxDecoration(
            color: Colors.amber.shade50,
            borderRadius: BorderRadius.circular(8),
            border: Border.all(color: Colors.amber.shade300),
          ),
          child: Column(
            children: [
              Text(
                '$modeLabel activo (solo esta sesión)'
                '${envState.serverHostname != null ? ' • ${envState.serverHostname}' : ''}',
                textAlign: TextAlign.center,
                style: TextStyle(
                  fontSize: 12,
                  fontWeight: FontWeight.w600,
                  color: Colors.amber.shade900,
                ),
              ),
              const SizedBox(height: 2),
              Text(
                envState.baseUrl,
                textAlign: TextAlign.center,
                style: TextStyle(fontSize: 11, color: Colors.amber.shade800),
              ),
              TextButton(
                onPressed: () async {
                  Environment.useProduction();
                  await ref.read(secureStorageProvider).clearAll();
                  ref.read(authStateProvider.notifier).clearError();
                },
                child: const Text(
                  'Volver a Producción',
                  style: TextStyle(fontSize: 12),
                ),
              ),
            ],
          ),
        );
      },
    );

    if (!AppConfig.enableQaServerSwitcher) {
      return footerContent;
    }

    return SecretEnvironmentGesture(
      onUnlocked: () => showQaPasswordAndServerSelector(context, ref),
      child: footerContent,
    );
  }
}
