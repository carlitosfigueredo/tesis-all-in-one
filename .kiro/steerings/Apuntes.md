## Apuntes para el desarrollo del sistema

No olviden que solo tienen hasta de tesis.

SEPTIEMBRE!!!!

para desarrollar todo el sistema y el libro

## Índice


Deben avanzar de manera progresiva con la implementación de sus sistemas, considerando las siguientes recomendaciones técnicas y funcionales:

## 0. Protección de formularios públicos

- Los formularios de ingreso de datos que no requieran autenticación deberán incorporar mecanismos de protección contra envíos automatizados, como CAPTCHA o reCAPTCHA. Asimismo, se recomienda implementar validaciones tanto en el cliente como en el servidor, limitar la cantidad de intentos por dirección IP, aplicar controles de frecuencia de envío, sanitizar los datos ingresados y registrar los eventos relevantes, a fin de prevenir ataques de bots, spam, inyección de código y uso abusivo del sistema.

## 1. Interfaz y usabilidad

- Cuando utilicen botones con íconos, se recomienda incorporar también un texto descriptivo que permita identificar rápidamente la función de cada botón.

- El sistema deberá contar con un diseño responsive, adaptable.

- Deben realizar pruebas de usabilidad y no olviden verificar todos los requerimientos funcionales y no funcionales definidos.

## 2. Gestión de usuarios

- El inicio de sesión debe estar permitido únicamente a usuarios activos.

- El sistema debe permitir la inactivación y reactivación de usuarios desde la interfaz de administración.

- Deben realizar pruebas que demuestren que un usuario inactivo no puede acceder al sistema.

- Se recomienda registrar la fecha de creación, modificación, inactivación y reactivación de cada usuario.

## 3. Autenticación y gestión de sesiones

- Las sesiones deben contar con un tiempo de expiración definido.

- El sistema deberá cerrar o invalidar la sesión luego de un periodo de inactividad.

- Debe impedirse el acceso a funcionalidades protegidas mediante la manipulación directa de direcciones URL.

- Deben realizar pruebas de acceso por URL para comprobar que cada usuario pueda ingresar únicamente a las opciones autorizadas según su rol o perfil.

- Al cerrar sesión, los tokens, cookies o identificadores de sesión deberán quedar invalidados.


## 4. Recuperación de contraseñas

El sistema debe tener un mecanismo seguro de recuperación o restablecimiento de contraseñas.

Como mínimo, deberá contemplar el siguiente flujo:

- 1. El usuario solicita el restablecimiento de su contraseña.

- 2. El sistema envía un correo electrónico con un enlace único.

- 3. El enlace contiene un token seguro, preferentemente generado mediante mecanismos criptográficos.

- 4. El token debe contar con un tiempo limitado de vigencia, por ejemplo, cinco o diez minutos.

- 5. Una vez utilizado o expirado, el enlace no puede volver a usarse.

- 6. La nueva contraseña debe ser definida directamente por el usuario.

Se recomienda que el sistema no envíe contraseñas generadas o almacenadas en texto plano.

## 5. Política de contraseñas

Deben establecer una política de contraseñas que contemple, como mínimo:

- Longitud mínima.

- Uso de letras mayúsculas y minúsculas.

- Inclusión de números.

- Inclusión de caracteres especiales.

- Restricción de contraseñas comunes o fácilmente predecibles.

- Confirmación de la contraseña.

- Posibilidad de definir un periodo de vigencia, cuando corresponda.

Preferentemente, estos parámetros deberán ser configurables desde el sistema y no encontrarse definidos de manera fija en el código fuente.

## 6. Validación de datos

- Los formularios deberán validar los datos tanto en el frontend como en el backend.

- Los correos electrónicos deberán validarse mediante patrones de formato adecuados.

- También deberán validarse números de teléfono, documentos de identidad, fechas, campos obligatorios, longitudes máximas y tipos de datos.

- Las validaciones del frontend no sustituyen las verificaciones que deben realizarse en el servidor o backend.


## 7. Auditoría y trazabilidad

El sistema deberá contar con mecanismos de auditoría para registrar las acciones relevantes realizadas por los usuarios.

El registro de auditoría podrá incluir:

- Usuario que realizó la acción.

- Fecha y hora.

- Dirección IP.

- Módulo o funcionalidad afectada.

- Acción realizada.

- Datos anteriores y posteriores a una modificación.

- Resultado de la operación.

- Intentos de acceso exitosos y fallidos.

Se recomienda investigar algún framework que utilice componentes de auditoría automática. También podrá implementarse un mecanismo propio mediante listeners, interceptores, middleware, triggers, eventos u otros componentes equivalentes.

Los registros de auditoría no deberán ser modificables por usuarios comunes.

## 8. Control de acceso y seguridad

- Los permisos deberán validarse en el backend y no solamente mediante la ocultación de botones o menús.

- Cada usuario debe acceder únicamente a las funcionalidades asociadas a su rol.

- Se deben realizar pruebas de acceso directo por URL.

- El sistema debe evitar que un usuario consulte, modifique o elimine información que no le corresponde.

- Los mensajes de error no deben exponer información técnica, consultas SQL, rutas internas, claves o datos sensibles.

- Las contraseñas deben almacenarse utilizando algoritmos seguros de hashing y nunca en texto plano.


## Recomendaciones para sistemas con modelo de suscripción

## 9. Presentación de planes

Cuando el modelo de negocio contemple planes o paquetes, el sistema debe disponer de una página pública o landing page que permita visualizar claramente:

- Nombre del plan.

- Precio.

- Periodicidad del pago.

- Funcionalidades incluidas.

- Límites de uso.

- Diferencias entre los planes.

- Condiciones de contratación.

- Opción para seleccionar o contratar el plan.

La información presentada deberá coincidir con las reglas implementadas dentro del sistema.

## 10. Gestión de suscripciones

El sistema debe controlar el ciclo de vida completo de una suscripción, incluyendo:

- Fecha de inicio.

- Fecha de vencimiento.

- Estado de la suscripción.

- Plan contratado.

- Historial de pagos.

- Renovaciones.

- Cancelaciones.

- Cambios de plan.

- Periodos de prueba, cuando correspondan.

También deberá existir una pantalla administrativa que permita consultar las suscripciones, identificar cuáles se encuentran activas, próximas a vencer, vencidas, canceladas o pendientes de pago.


## 11. Vencimiento de planes

Cuando una suscripción haya vencido, el comportamiento del sistema debe estar claramente definido.

Entre las alternativas posibles se encuentran:

- Permitir el inicio de sesión, pero restringir las funcionalidades principales.

- Permitir únicamente la consulta de información.

- Mostrar una pantalla que solicite la renovación del plan.

- Bloquear determinadas operaciones hasta que se regularice el pago.

- Impedir el acceso al sistema, cuando el modelo de negocio así lo requiera.

La alternativa seleccionada debe estar reflejada en los requerimientos funcionales y reglas de negocio.

## 12. Cambio de plan

Cuando existan diferentes planes, el sistema deberá permitir que un usuario pueda cambiar de uno a otro.

Por ejemplo, si un usuario dispone de un plan básico y desea acceder a un plan superior, el sistema deberá:

- 1. Mostrar las diferencias entre ambos planes.

- 2. Calcular el importe correspondiente.

- 3. Procesar el pago.

- 4. Actualizar la suscripción.

- 5. Habilitar las nuevas funcionalidades.

- 6. Registrar el cambio en el historial.

- 7. Informar al usuario que la operación fue realizada correctamente.

También debe definirse cómo se manejarán los cambios a planes inferiores, los cobros proporcionales (si amerita).

## 13. Notificaciones de vencimiento

El sistema deberá informar al usuario sobre la proximidad del vencimiento de su suscripción.

Se recomienda incluir:

- Avisos dentro del sistema.

- Fecha de vencimiento visible en el perfil o panel principal.

- Correos electrónicos de recordatorio.


- Notificaciones anticipadas, por ejemplo, siete días, tres días y un día antes del vencimiento.

- Comunicación posterior al vencimiento, cuando corresponda.

Los envíos pueden quedar registrados para fines de seguimiento y auditoría.

## Integración con pasarelas de pago

## 14. Uso de una pasarela real

Los sistemas que contemplen pagos electrónicos deben integrar una pasarela de pago real en su entorno de desarrollo, pruebas o sandbox.

No es necesario realizar la puesta en producción con la procesadora; sin embargo, deberá demostrarse que la integración permite:

- Generar una operación de pago.

- Redireccionar o comunicarse con la pasarela.

- Recibir la respuesta de la transacción.

- Diferenciar pagos aprobados, rechazados, cancelados o pendientes.

- Actualizar el estado de la suscripción.

- Registrar el identificador de la transacción.

- Evitar que una misma operación sea procesada más de una vez.

- Validar las notificaciones o respuestas recibidas desde la pasarela.

No deberá simularse el pago únicamente mediante un botón que cambie manualmente el estado de una transacción.

## 15. Comprobantes y facturación

Deben analizar correctamente qué entidad es responsable de emitir la factura o comprobante correspondiente.

Por tanto, la tesis deberá diferenciar claramente entre: Comprobante de pago, Confirmación de la transacción, Recibo, Factura legal, Nota de crédito o devolución.


## Configuración de correos electrónicos

## 16. Configuración del servicio de correo

Cuando el sistema incluya funciones de envío de correos electrónicos, las configuraciones del servidor SMTP o del proveedor utilizado deben ser parametrizables.

Entre los datos configurables pueden incluirse:

- Servidor SMTP.

- Puerto.

- Tipo de cifrado.

- Usuario.

- Correo remitente.

- Nombre del remitente.

- Tiempo de espera.

- Plantillas de correo.

- Estado de habilitación del servicio.

Preferentemente, esta configuración podrá administrarse desde una interfaz web restringida a usuarios autorizados.

Las contraseñas, tokens y credenciales del servicio de correo no deberán mostrarse directamente ni almacenarse sin protección.

## 17. Implementar mensajes claros para el usuario

Los mensajes del sistema deben indicar:

- Qué ocurrió.

- Por qué ocurrió.

- Qué debe hacer el usuario.

Eviten mensajes exclusivamente técnicos como “error 500”, “null reference” o “constraint violation”. Los detalles técnicos pueden registrarse en logs, pero no deberían mostrarse al usuario final.

## 18. Manejar correctamente las excepciones

El sistema debe contemplar situaciones como:

- Pérdida de conexión.

- Servicio externo no disponible.

- Archivo inválido.


- Registro duplicado.

- Sesión expirada.

- Datos incompletos.

- Operación no autorizada.

- Error durante una transacción.

El sistema no debe quedar bloqueado ni guardar información incompleta cuando ocurra un error.

## 19. Evitar registros duplicados

Definan controles para datos que deben ser únicos, por ejemplo:

- Número de documento.

- Correo electrónico.

- Código de producto.

- Otro

La validación debe realizarse tanto en la aplicación como, cuando corresponda, mediante restricciones en la base de datos.

## 20. Aplicar borrado lógico

Cuando la información tenga valor histórico, no es recomendable eliminarla físicamente. Puede utilizarse un estado como:

- Activo.

- Inactivo.

- Anulado.

- Eliminado lógicamente.

Esto permite conservar la trazabilidad y evitar inconsistencias en reportes o transacciones anteriores.

## 21. Implementar filtros y búsquedas útiles

- Fechas.

- Estado.

- Usuario.

- Código.

- Categoría.

- Documento.

- Rango de importes.

Los listados deben permitir buscar y filtrar información por criterios relevantes, como:


También se recomienda incorporar paginación cuando exista una gran cantidad de registros.

## 22. Validar archivos adjuntos

Cuando el sistema permita cargar archivos, se debe controlar:

- Tipo de archivo.

- Extensión.

- Tamaño máximo.

- Nombre del archivo.

- Cantidad permitida.

- Archivos duplicados.

- Permisos de acceso.

No se debe confiar únicamente en la extensión, ya que un archivo puede tener una extensión diferente a su contenido real.

## 23. Verificar las exportaciones

Cuando se permita exportar datos a Excel, PDF o CSV, se debe validar:

- Encabezados.

- Formato de fechas.

- Separadores decimales.

- Acentos y caracteres especiales.

- Totales.

- Filtros aplicados.

- Nombre del archivo.

- Fecha de generación.

El archivo exportado debe coincidir con los datos visualizados o con los criterios seleccionados.

## 24. No guardar credenciales en el código fuente

Las contraseñas, claves de API, tokens y credenciales de base de datos deben gestionarse mediante:

- Variables de entorno.

- Archivos de configuración protegidos.

- Servicios de administración de secretos.

No deben quedar expuestas en repositorios públicos ni incorporadas directamente en el código.


## 25. Gestionar correctamente las migraciones de base de datos

Los cambios en la estructura de la base de datos deben estar versionados. Esto permite reproducir el proyecto en otro equipo y conocer:

- Qué tablas fueron creadas.

- Qué campos fueron agregados.

- Qué restricciones fueron modificadas.

- En qué orden deben ejecutarse los cambios.

## 26. Documentar la instalación

La tesis debe incluir instrucciones suficientes para instalar y ejecutar el sistema:

- Requisitos previos.

- Versiones utilizadas.

- Configuración de la base de datos.

- Dependencias.

- Variables de entorno.

- Comandos de ejecución.

- Usuarios iniciales.

- Procedimiento de despliegue.

Otro desarrollador debería poder ejecutar el sistema siguiendo la documentación. No se olviden del archivo README en el repositorio.

## 27. Incorporar datos iniciales controlados

El sistema puede incluir datos básicos necesarios para funcionar, por ejemplo:

- Roles.

- Estados.

- Tipos de documentos.

- Parámetros generales.

- Usuario administrador inicial.

Estos datos deben cargarse mediante scripts o mecanismos controlados, no de forma manual cada vez que se instala el sistema.

## 28. Evitar consultas innecesarias a la base de datos

Revisen que los listados, paneles y reportes no ejecuten una consulta por cada registro. También es importante utilizar índices en campos frecuentemente usados para búsquedas, filtros y relaciones.


## 29. Implementar confirmaciones para acciones críticas

Acciones como eliminar, cancelar, anular, bloquear o finalizar deberían requerir confirmación.

En operaciones sensibles también puede solicitarse:

- Motivo.

- Observación.

- Contraseña.

- Código de verificación.

- Permiso especial.

## 30. Controlar operaciones simultáneas

Analicen qué ocurre si dos usuarios intentan modificar el mismo registro al mismo tiempo. El sistema debe evitar:

- Sobrescritura silenciosa.

- Duplicación de operaciones.

- Descuento doble de stock.

- Confirmación doble de pagos.

- Estados inconsistentes.

## 31. Realizar pruebas negativas

No prueben únicamente que el sistema funciona cuando los datos son correctos. También deben intentar:

- Enviar campos vacíos.

- Ingresar formatos incorrectos.

- Repetir operaciones.

- Acceder sin permisos.

- Manipular identificadores.

- Utilizar enlaces expirados.

- Cargar archivos no permitidos.

- Ingresar cantidades negativas.

## 32. Medir el cumplimiento de los requerimientos no funcionales

No basta con afirmar que el sistema es seguro, rápido o usable. Deben establecerse métricas verificables.

Ejemplos:


- Una pantalla debe cargar en menos de tres segundos.

- La sesión expira después de cierto tiempo de inactividad.

- El sistema soporta determinada cantidad de usuarios concurrentes.

- La interfaz puede utilizarse en resoluciones específicas.

- El respaldo puede restaurarse dentro de un tiempo definido.

Recuerden siempre sus requerimientos no funcionales.

## 33. Evitar información fija en el código

Datos como tasas, límites, porcentajes, textos de notificación, tiempo de expiración o cantidad máxima de intentos deberían ser configurables cuando puedan cambiar con el tiempo.

## 34. Revisar la calidad del código

Antes de la entrega, eliminen:

- Código comentado sin utilidad.

- Métodos duplicados.

- Variables sin nombres claros.

- Archivos de prueba innecesarios.

- Credenciales.

- Mensajes de depuración.

- Dependencias no utilizadas.

La organización del código también forma parte de la calidad del producto presentado.

## 35. Política de privacidad y consentimiento informado

Deben armar su política de privacidad ya que los sistemas que recopilen o procesen datos personales deberán contar con una y, cuando corresponda, con un mecanismo de consentimiento informado.

La Política de Privacidad deberá indicar, como mínimo:

- Qué datos se recopilan.

- Para qué serán utilizados.

- Quién es responsable de su tratamiento.

- Durante cuánto tiempo serán conservados.

- Si serán compartidos con terceros.

- Qué medidas generales de seguridad se aplican.

- Cómo puede el usuario solicitar la actualización, corrección o eliminación de sus datos.


El consentimiento deberá solicitarse antes de recopilar o utilizar la información. La casilla de aceptación no debe estar seleccionada por defecto y debe explicar claramente qué autoriza el usuario.

El sistema puede registrar evidencia del consentimiento, incluyendo:

- Usuario.

- Fecha y hora.

- Versión de la política aceptada.

- Finalidad autorizada.

- Fecha de revocación, cuando corresponda.

También puede permitir al usuario retirar su consentimiento, actualizar sus datos o solicitar su eliminación, salvo aquellos registros que deban conservarse por razones legales, contractuales o de auditoría.

La Política de Privacidad debe estar disponible desde el registro, el inicio de sesión o el pie de página del sistema. No debe incorporarse únicamente como un texto informativo, sino que debe estar vinculada con los requerimientos, la base de datos y las funcionalidades implementadas.

## 36. Contenido del recibo de dinero o comprobante de pago

Si el sistema emitirá un recibo electrónico de dinero (no una factura electrónica con efectos tributarios), es recomendable que el comprobante contenga la información suficiente para acreditar la recepción del pago, facilitar auditorías y permitir su trazabilidad. Pudiendo incluir:

- \- Identificación del recibo: Número único de recibo autonumerado, Fecha y hora de emisión, Estado del recibo (Emitido o Pagado, Anulado, Reimpreso, etc.).

- \- Datos del emisor: Nombre del emisor, RUC (si aplica), Correo electrónico, Logotipo (opcional).

- \- Datos del pagador: Nombre y apellido o razón social, Número de documento de identidad o RUC, Dirección (opcional), Teléfono o correo electrónico (opcional).

- \- Detalle del concepto: Concepto del pago, Referencia o número de expediente, contrato, solicitud o trámite, Período al que corresponde el pago (si aplica).

- \- Información del monto: Importe en números, Importe en letras, Moneda, Desglose de conceptos cuando existan varios ítems, Total recibido.

- \- Forma de pago: Efectivo, Transferencia bancaria, Tarjeta de crédito/débito, Cheque, Billetera electrónica, Otro medio de pago.

- \- Información de trazabilidad: Fecha y hora del registro.

- \- Leyenda como: "Este recibo electrónico acredita únicamente la recepción del importe indicado y ha sido generado por el Sistema XXXX."


Recomendaciones técnicas para el desarrollo del sistema

- Numerar automáticamente los recibos evitando duplicados.

- Impedir la modificación del recibo una vez emitido; cualquier corrección debería realizarse mediante anulación y emisión de un nuevo comprobante (podría ser para trabajos futuros de la tesis pero es bueno que lo sepan por si la mesa consulta).

- Registrar una bitácora de auditoría con información sobre quién emitió, anuló o reimprimió el recibo y cuándo lo hizo.

- Mostrar la fecha y hora de emisión utilizando el reloj del servidor para garantizar la integridad del registro.

Imagen de referencia, cada tesista puede ajustar a su parecer


## 37. Matriz de riesgos

Tener en cuenta que podrían agregar como un riesgo la baja adopción inicial del sistema que viene de la mano con el modelo de negocios adoptado.
