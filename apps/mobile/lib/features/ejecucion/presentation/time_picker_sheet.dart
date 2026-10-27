import 'package:flutter/material.dart';

/// Modal interactivo y mejorado para capturar hora (Hora de Entrada / Salida)
///
/// Ofrece:
/// - Selector tipo tambor (Drum Picker) para horas y minutos
/// - Vista clara en 24h y 12h con indicador AM / PM
/// - Conmutador rápido AM / PM
/// - Atajos de minutos (:00, :15, :30, :45)
/// - Botones rápidos (Ahora, -30m, -1h, -2h, +30m, +1h)
/// - Opción de abrir el reloj nativo del sistema si el técnico prefiere teclado o dial
Future<TimeOfDay?> showMekanosTimePicker({
  required BuildContext context,
  required TimeOfDay initialTime,
  required String title,
}) {
  return showDialog<TimeOfDay>(
    context: context,
    barrierDismissible: true,
    builder: (ctx) => Dialog(
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
      insetPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 24),
      clipBehavior: Clip.antiAlias,
      elevation: 10,
      child: ConstrainedBox(
        constraints: const BoxConstraints(maxWidth: 390),
        child: TimePickerSheet(
          initialTime: initialTime,
          title: title,
        ),
      ),
    ),
  );
}

class TimePickerSheet extends StatefulWidget {
  final TimeOfDay initialTime;
  final String title;

  const TimePickerSheet({
    super.key,
    required this.initialTime,
    required this.title,
  });

  @override
  State<TimePickerSheet> createState() => _TimePickerSheetState();
}

class _TimePickerSheetState extends State<TimePickerSheet> {
  late FixedExtentScrollController _hourController;
  late FixedExtentScrollController _minuteController;
  late int _selectedHour;
  late int _selectedMinute;

  @override
  void initState() {
    super.initState();
    _selectedHour = widget.initialTime.hour;
    _selectedMinute = widget.initialTime.minute;
    _hourController = FixedExtentScrollController(initialItem: _selectedHour);
    _minuteController = FixedExtentScrollController(initialItem: _selectedMinute);
  }

  @override
  void dispose() {
    _hourController.dispose();
    _minuteController.dispose();
    super.dispose();
  }

  void _setTime(int hour, int minute) {
    final h = hour.clamp(0, 23);
    final m = minute.clamp(0, 59);
    setState(() {
      _selectedHour = h;
      _selectedMinute = m;
    });
    if (_hourController.hasClients) {
      _hourController.animateToItem(
        h,
        duration: const Duration(milliseconds: 250),
        curve: Curves.easeOut,
      );
    }
    if (_minuteController.hasClients) {
      _minuteController.animateToItem(
        m,
        duration: const Duration(milliseconds: 250),
        curve: Curves.easeOut,
      );
    }
  }

  void _toggleAmPm(bool toPm) {
    int currentHour = _selectedHour;
    final isPm = currentHour >= 12;
    if (toPm && !isPm) {
      currentHour += 12;
      _setTime(currentHour, _selectedMinute);
    } else if (!toPm && isPm) {
      currentHour -= 12;
      _setTime(currentHour, _selectedMinute);
    }
  }

  Future<void> _abrirRelojNativo() async {
    final picked = await showTimePicker(
      context: context,
      initialTime: TimeOfDay(hour: _selectedHour, minute: _selectedMinute),
      helpText: widget.title,
      confirmText: 'ACEPTAR',
      cancelText: 'CANCELAR',
      builder: (context, child) {
        return MediaQuery(
          data: MediaQuery.of(context).copyWith(alwaysUse24HourFormat: false),
          child: child ?? const SizedBox.shrink(),
        );
      },
    );

    if (picked != null && mounted) {
      Navigator.of(context).pop(picked);
    }
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final isPm = _selectedHour >= 12;
    final hour12 = _selectedHour == 0
        ? 12
        : (_selectedHour > 12 ? _selectedHour - 12 : _selectedHour);
    final formatted12 =
        '${hour12.toString().padLeft(2, '0')}:${_selectedMinute.toString().padLeft(2, '0')} ${isPm ? "p. m." : "a. m."}';
    final formatted24 =
        '${_selectedHour.toString().padLeft(2, '0')}:${_selectedMinute.toString().padLeft(2, '0')}';

    return Container(
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(20),
      ),
      child: SingleChildScrollView(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            // Título
            Padding(
              padding: const EdgeInsets.fromLTRB(18, 16, 12, 4),
              child: Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Icon(Icons.schedule, size: 20, color: theme.colorScheme.primary),
                      const SizedBox(width: 8),
                      Text(
                        widget.title.toUpperCase(),
                        style: TextStyle(
                          fontSize: 13,
                          fontWeight: FontWeight.bold,
                          color: Colors.grey.shade800,
                          letterSpacing: 0.8,
                        ),
                      ),
                    ],
                  ),
                  TextButton.icon(
                    onPressed: _abrirRelojNativo,
                    icon: const Icon(Icons.access_time, size: 16),
                    label: const Text(
                      'Reloj del sistema',
                      style: TextStyle(fontSize: 11),
                    ),
                    style: TextButton.styleFrom(
                      visualDensity: VisualDensity.compact,
                      padding: const EdgeInsets.symmetric(horizontal: 6),
                    ),
                  ),
                ],
              ),
            ),

            // Visualización principal de hora (12h y 24h)
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 2),
              child: Container(
                padding: const EdgeInsets.symmetric(vertical: 6, horizontal: 14),
                decoration: BoxDecoration(
                  color: theme.colorScheme.primary.withValues(alpha: 0.06),
                  borderRadius: BorderRadius.circular(12),
                ),
                child: Row(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    Text(
                      formatted24,
                      style: TextStyle(
                        fontSize: 32,
                        fontWeight: FontWeight.bold,
                        color: theme.colorScheme.primary,
                        letterSpacing: 1,
                      ),
                    ),
                    const SizedBox(width: 12),
                    Container(
                      padding: const EdgeInsets.symmetric(
                        horizontal: 8,
                        vertical: 3,
                      ),
                      decoration: BoxDecoration(
                        color: Colors.white,
                        borderRadius: BorderRadius.circular(6),
                        border: Border.all(
                          color: theme.colorScheme.primary.withValues(alpha: 0.3),
                        ),
                      ),
                      child: Text(
                        formatted12,
                        style: TextStyle(
                          fontSize: 13,
                          fontWeight: FontWeight.w600,
                          color: theme.colorScheme.primary,
                        ),
                      ),
                    ),
                  ],
                ),
              ),
            ),

            // Selector AM / PM
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 4),
              child: SegmentedButton<bool>(
                segments: const [
                  ButtonSegment<bool>(
                    value: false,
                    label: Text('a. m. (Mañana)', style: TextStyle(fontSize: 12)),
                    icon: Icon(Icons.wb_sunny_outlined, size: 15),
                  ),
                  ButtonSegment<bool>(
                    value: true,
                    label: Text('p. m. (Tarde)', style: TextStyle(fontSize: 12)),
                    icon: Icon(Icons.nightlight_round_outlined, size: 15),
                  ),
                ],
                selected: {isPm},
                onSelectionChanged: (set) {
                  if (set.isNotEmpty) _toggleAmPm(set.first);
                },
                style: const ButtonStyle(
                  visualDensity: VisualDensity.compact,
                ),
              ),
            ),

            // Tambor de selección
            SizedBox(
              height: 125,
              child: Row(
                children: [
                  // Columna Horas
                  Expanded(
                    child: Column(
                      children: [
                        Text(
                          'HORA (0-23)',
                          style: TextStyle(
                            fontSize: 11,
                            fontWeight: FontWeight.bold,
                            color: Colors.grey.shade600,
                          ),
                        ),
                        Expanded(
                          child: _buildWheel(
                            controller: _hourController,
                            itemCount: 24,
                            selectedValue: _selectedHour,
                            onChanged: (val) => setState(() => _selectedHour = val),
                          ),
                        ),
                      ],
                    ),
                  ),
                  Text(
                    ':',
                    style: TextStyle(
                      fontSize: 28,
                      fontWeight: FontWeight.bold,
                      color: Colors.grey.shade400,
                    ),
                  ),
                  // Columna Minutos
                  Expanded(
                    child: Column(
                      children: [
                        Text(
                          'MINUTO (0-59)',
                          style: TextStyle(
                            fontSize: 11,
                            fontWeight: FontWeight.bold,
                            color: Colors.grey.shade600,
                          ),
                        ),
                        Expanded(
                          child: _buildWheel(
                            controller: _minuteController,
                            itemCount: 60,
                            selectedValue: _selectedMinute,
                            onChanged: (val) => setState(() => _selectedMinute = val),
                          ),
                        ),
                      ],
                    ),
                  ),
                ],
              ),
            ),

            // Atajos rápidos de minutos
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 2),
              child: Row(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  Text(
                    'Minutos:',
                    style: TextStyle(fontSize: 11, color: Colors.grey.shade600),
                  ),
                  const SizedBox(width: 8),
                  _minuteChip(0),
                  const SizedBox(width: 6),
                  _minuteChip(15),
                  const SizedBox(width: 6),
                  _minuteChip(30),
                  const SizedBox(width: 6),
                  _minuteChip(45),
                ],
              ),
            ),

            // Botones rápidos relativos
            Padding(
              padding: const EdgeInsets.symmetric(vertical: 4),
              child: SingleChildScrollView(
                scrollDirection: Axis.horizontal,
                padding: const EdgeInsets.symmetric(horizontal: 16),
                child: Row(
                  children: [
                    _quickButton('Ahora', () {
                      final now = TimeOfDay.now();
                      _setTime(now.hour, now.minute);
                    }, destacado: true),
                    const SizedBox(width: 8),
                    _quickButton('-30 min', () {
                      final total = _selectedHour * 60 + _selectedMinute - 30;
                      final adjusted = (total + 1440) % 1440;
                      _setTime(adjusted ~/ 60, adjusted % 60);
                    }),
                    const SizedBox(width: 8),
                    _quickButton('-1 hora', () {
                      final total = _selectedHour * 60 + _selectedMinute - 60;
                      final adjusted = (total + 1440) % 1440;
                      _setTime(adjusted ~/ 60, adjusted % 60);
                    }),
                    const SizedBox(width: 8),
                    _quickButton('+30 min', () {
                      final total = _selectedHour * 60 + _selectedMinute + 30;
                      final adjusted = total % 1440;
                      _setTime(adjusted ~/ 60, adjusted % 60);
                    }),
                    const SizedBox(width: 8),
                    _quickButton('+1 hora', () {
                      final total = _selectedHour * 60 + _selectedMinute + 60;
                      final adjusted = total % 1440;
                      _setTime(adjusted ~/ 60, adjusted % 60);
                    }),
                  ],
                ),
              ),
            ),

            const SizedBox(height: 8),

            // Acciones Aceptar / Cancelar
            Padding(
              padding: const EdgeInsets.fromLTRB(16, 4, 16, 16),
              child: Row(
                children: [
                  Expanded(
                    child: OutlinedButton(
                      onPressed: () => Navigator.of(context).pop(null),
                      style: OutlinedButton.styleFrom(
                        padding: const EdgeInsets.symmetric(vertical: 12),
                        shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(12),
                        ),
                      ),
                      child: const Text('CANCELAR'),
                    ),
                  ),
                  const SizedBox(width: 14),
                  Expanded(
                    child: ElevatedButton(
                      onPressed: () {
                        Navigator.of(context).pop(
                          TimeOfDay(
                            hour: _selectedHour,
                            minute: _selectedMinute,
                          ),
                        );
                      },
                      style: ElevatedButton.styleFrom(
                        backgroundColor: theme.colorScheme.primary,
                        foregroundColor: Colors.white,
                        padding: const EdgeInsets.symmetric(vertical: 12),
                        shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(12),
                        ),
                      ),
                      child: const Text(
                        'ACEPTAR',
                        style: TextStyle(fontWeight: FontWeight.bold),
                      ),
                    ),
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildWheel({
    required FixedExtentScrollController controller,
    required int itemCount,
    required int selectedValue,
    required ValueChanged<int> onChanged,
  }) {
    return ListWheelScrollView.useDelegate(
      controller: controller,
      itemExtent: 38,
      perspective: 0.003,
      diameterRatio: 1.2,
      physics: const FixedExtentScrollPhysics(),
      onSelectedItemChanged: onChanged,
      childDelegate: ListWheelChildBuilderDelegate(
        childCount: itemCount,
        builder: (context, index) {
          final isSelected = index == selectedValue;
          return Center(
            child: AnimatedDefaultTextStyle(
              duration: const Duration(milliseconds: 150),
              style: TextStyle(
                fontSize: isSelected ? 24 : 16,
                fontWeight: isSelected ? FontWeight.bold : FontWeight.w400,
                color: isSelected
                    ? Theme.of(context).colorScheme.primary
                    : Colors.grey.shade400,
              ),
              child: Text(index.toString().padLeft(2, '0')),
            ),
          );
        },
      ),
    );
  }

  Widget _minuteChip(int minute) {
    final isSelected = _selectedMinute == minute;
    final theme = Theme.of(context);
    return InkWell(
      onTap: () {
        setState(() => _selectedMinute = minute);
        if (_minuteController.hasClients) {
          _minuteController.animateToItem(
            minute,
            duration: const Duration(milliseconds: 200),
            curve: Curves.easeOut,
          );
        }
      },
      borderRadius: BorderRadius.circular(8),
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
        decoration: BoxDecoration(
          color: isSelected
              ? theme.colorScheme.primary
              : Colors.grey.shade100,
          borderRadius: BorderRadius.circular(8),
          border: Border.all(
            color: isSelected ? theme.colorScheme.primary : Colors.grey.shade300,
          ),
        ),
        child: Text(
          ':${minute.toString().padLeft(2, '0')}',
          style: TextStyle(
            fontSize: 12,
            fontWeight: isSelected ? FontWeight.bold : FontWeight.w500,
            color: isSelected ? Colors.white : Colors.grey.shade800,
          ),
        ),
      ),
    );
  }

  Widget _quickButton(String label, VoidCallback onTap, {bool destacado = false}) {
    final theme = Theme.of(context);
    return Material(
      color: destacado
          ? theme.colorScheme.primary.withValues(alpha: 0.12)
          : Colors.grey.shade100,
      borderRadius: BorderRadius.circular(16),
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(16),
        child: Padding(
          padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
          child: Text(
            label,
            style: TextStyle(
              fontSize: 12,
              fontWeight: destacado ? FontWeight.bold : FontWeight.w500,
              color: destacado ? theme.colorScheme.primary : Colors.grey.shade800,
            ),
          ),
        ),
      ),
    );
  }
}

