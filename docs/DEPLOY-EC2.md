# Deploy en AWS EC2 (una sola instancia) — Amazon Linux 2023

Guia paso a paso para desplegar todo el sistema en **una sola instancia EC2**, con
**solo el frontend/Nginx publico** y el resto (backend, ML, base de datos) en red
privada de Docker. HTTPS via **Cloudflare** y correos reales con **Gmail** (demo).

Arquitectura resultante:

```
Internet ── Cloudflare (HTTPS) ──► EC2 :80 (Nginx)
                                     ├── /      → frontend estatico
                                     └── /api   → backend:4000  (red interna)
                                                    ├── ml-service:8000  (red interna)
                                                    └── postgres:5432    (red interna)
```

Solo los puertos **22 (SSH), 80 y 443** quedan abiertos. Postgres, backend y ML
nunca se exponen a internet.

---

## 1. Crear la instancia EC2

1. Consola AWS → **EC2** → **Launch instance**.
2. **Name:** `tesis-bi`.
3. **AMI:** Amazon Linux 2023 (x86_64).
4. **Tipo:** `t3.small` como minimo (2 GB RAM). El build del frontend + Postgres +
   Python ML se queda corto en `t2.micro` (1 GB). Si solo tenes free tier `t2.micro`,
   agrega swap (ver Anexo A).
5. **Key pair:** crea o elige un `.pem` para SSH. Guardalo bien.
6. **Storage:** subi a **20 GB** gp3 (las imagenes Docker ocupan).
7. **Network / Security group:** crear uno nuevo con estas reglas de entrada:

   | Tipo   | Puerto | Origen           | Motivo                          |
   |--------|--------|------------------|---------------------------------|
   | SSH    | 22     | Mi IP            | Acceso administrativo           |
   | HTTP   | 80     | 0.0.0.0/0        | Trafico web (Cloudflare)        |
   | HTTPS  | 443    | 0.0.0.0/0        | Reservado (Cloudflare)          |

   > No abras 4000, 8000 ni 5432. Ese es justamente el punto: quedan privados.
   > Mas seguro aun: en Origen de 80/443 pone solo los rangos de IP de Cloudflare
   > (https://www.cloudflare.com/ips/) para que nadie llegue al server salvo via Cloudflare.

8. Lanzar y anotar la **IP publica** (o mejor, asignar una **Elastic IP** para que no
   cambie al reiniciar: EC2 → Elastic IPs → Allocate → Associate a la instancia).

---

## 2. Conectarse por SSH

```bash
# desde tu maquina (ajusta ruta del .pem y la IP)
ssh -i "ruta/al/tesis-bi.pem" ec2-user@TU_IP_PUBLICA
```

En Windows/PowerShell es el mismo comando. Si se queja por permisos del `.pem`, en
Linux/Mac: `chmod 400 tesis-bi.pem`.

---

## 3. Instalar Docker y Docker Compose

```bash
# Actualizar el sistema
sudo dnf update -y

# Instalar Docker
sudo dnf install -y docker

# Arrancar Docker y habilitarlo en el boot
sudo systemctl enable --now docker

# Permitir usar docker sin sudo
sudo usermod -aG docker ec2-user

# Instalar el plugin docker compose v2
sudo mkdir -p /usr/local/lib/docker/cli-plugins
sudo curl -SL https://github.com/docker/compose/releases/latest/download/docker-compose-linux-x86_64 \
  -o /usr/local/lib/docker/cli-plugins/docker-compose
sudo chmod +x /usr/local/lib/docker/cli-plugins/docker-compose

# Instalar git
sudo dnf install -y git
```

**Cierra la sesion SSH y volve a entrar** para que tome el grupo `docker`. Verifica:

```bash
docker --version
docker compose version
```

---

## 4. Traer el codigo

```bash
# Opcion A: clonar desde tu repositorio
git clone TU_REPO_URL tesis-all-in-one
cd tesis-all-in-one

# Opcion B: si no esta en un repo, subilo por scp desde tu maquina:
#   scp -i tesis-bi.pem -r ./tesis-all-in-one ec2-user@TU_IP:/home/ec2-user/
```

---

## 5. Configurar variables de entorno

```bash
cp .env.prod.example .env.prod
nano .env.prod
```

Completa como minimo:

- `FRONTEND_URL=https://tudominio.com` (tu dominio real de Cloudflare).
- `POSTGRES_PASSWORD` y el mismo valor dentro de `DATABASE_URL`.
- `JWT_SECRET` — genera uno con: `openssl rand -base64 48`.
- `RECAPTCHA_SITE_KEY` / `RECAPTCHA_SECRET_KEY`.
- Bloque **SMTP Gmail** (ver seccion 8).
- PayPal / AdamsPay si vas a demostrar pagos.

Guarda con `Ctrl+O`, `Enter`, `Ctrl+X`.

---

## 6. Levantar todo

```bash
docker compose -f docker-compose.prod.yml --env-file .env.prod up -d --build
```

La primera vez tarda (build del frontend y descarga de imagenes). El backend corre
automaticamente `prisma migrate deploy` al arrancar.

Cargar los datos iniciales (superadmin, roles, planes, demo) una sola vez:

```bash
docker exec tesis_backend node prisma/seed.js
```

Comprobar que todo esta arriba:

```bash
docker compose -f docker-compose.prod.yml ps
docker compose -f docker-compose.prod.yml logs -f backend   # Ctrl+C para salir
```

Prueba local en la instancia (debe responder el health check):

```bash
curl http://localhost/api/plans
```

---

## 7. DNS en Cloudflare (HTTPS)

1. En Cloudflare, agrega tu dominio (si no lo tenes ya) y apunta los **nameservers**
   de tu registrador a los que te da Cloudflare.
2. **DNS → Records → Add record:**
   - Tipo **A**, Name `@` (o `www`), IPv4 = **la Elastic IP** de tu EC2.
   - **Proxy status: Proxied** (nube naranja). Esto activa el HTTPS y esconde tu IP.
3. **SSL/TLS → Overview:** modo **Flexible** para empezar (Cloudflare habla HTTPS con
   el visitante y HTTP con tu server en el puerto 80, que es lo que Nginx sirve).
   - Cuando quieras algo mas robusto, pasa a **Full** instalando un certificado de
     origen de Cloudflare en Nginx (opcional para la demo).
4. Espera unos minutos y entra a `https://tudominio.com`. Deberias ver el frontend con
   candado.

> Como el frontend llama a `/api` (mismo dominio), no hay CORS ni IPs expuestas.

---

## 8. Correo real con Gmail (demo)

El codigo ya soporta Gmail; solo configuras variables. Pasos:

1. En la cuenta de Google, activa **Verificacion en 2 pasos**
   (https://myaccount.google.com/security). Sin esto no hay App Passwords.
2. Crea una **Contrasena de aplicacion**: https://myaccount.google.com/apppasswords
   - Elegi "Correo" / "Otro" y ponele un nombre (ej. `tesis-bi`).
   - Google te da **16 caracteres**. Copialos **sin espacios**.
3. En `.env.prod`:

   ```env
   SMTP_HOST=smtp.gmail.com
   SMTP_PORT=587
   SMTP_SECURE=false
   SMTP_USER=tucorreo@gmail.com
   SMTP_PASS=los16caracteres
   SMTP_FROM="Sistema BI <tucorreo@gmail.com>"
   ```

4. Recrea el backend para que tome las variables:

   ```bash
   docker compose -f docker-compose.prod.yml --env-file .env.prod up -d backend
   ```

5. Prueba el flujo de "olvide mi contrasena" desde la web y revisa que llegue el correo.

### Importante: bloqueo de puertos SMTP en AWS

AWS bloquea por defecto el trafico **saliente** a los puertos 25/465/587 hacia fuera
de AWS en cuentas nuevas, como medida anti-spam. El 587 de Gmail **a veces pasa igual**.
Si los correos no salen (en los logs del backend veras timeouts al conectar a Gmail):

- **Comprobalo** desde la instancia:
  ```bash
  # si queda "colgado" sin conectar, esta bloqueado
  curl -v telnet://smtp.gmail.com:587
  ```
- **Solucion oficial:** pedir a AWS que quite la restriccion con el formulario
  "Request to remove email sending limitations" (necesita una Elastic IP asociada).
  Suele tardar 24-48 h.
- **Alternativa rapida para demo:** usar un proveedor por API HTTP (puerto 443, que
  nunca se bloquea) como Brevo, Resend o SendGrid. Requiere un pequeno cambio en
  `email.service.js`. Avisame si llegas a este punto y lo adaptamos.

---

## 9. Operacion diaria

```bash
# Ver logs
docker compose -f docker-compose.prod.yml logs -f

# Reiniciar un servicio
docker compose -f docker-compose.prod.yml restart backend

# Actualizar tras cambios de codigo
git pull
docker compose -f docker-compose.prod.yml --env-file .env.prod up -d --build

# Apagar todo
docker compose -f docker-compose.prod.yml down

# Backup de la base de datos
docker exec tesis_postgres pg_dump -U tesis_user tesis_bi_db > backup_$(date +%F).sql
```

---

## Anexo A: agregar swap (si usas t2.micro / 1 GB RAM)

El build del frontend puede quedarse sin memoria. Agrega 2 GB de swap:

```bash
sudo dd if=/dev/zero of=/swapfile bs=1M count=2048
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile
echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab
free -h   # deberia mostrar la swap activa
```

---

## Checklist final

- [ ] Security group: solo 22, 80, 443 abiertos (idealmente 80/443 solo a IPs de Cloudflare).
- [ ] `.env.prod` completo, con `POSTGRES_PASSWORD` y `JWT_SECRET` fuertes.
- [ ] `docker compose ... ps` muestra los 4 servicios `Up`.
- [ ] Seed ejecutado una vez.
- [ ] DNS de Cloudflare apuntando a la Elastic IP, en modo Proxied.
- [ ] `https://tudominio.com` carga el frontend con candado.
- [ ] Dominio agregado en la consola de reCAPTCHA.
- [ ] Correo de Gmail probado (o proveedor por API si AWS bloquea SMTP).
- [ ] Backend, ML y Postgres NO responden desde internet (probar `http://TU_IP:4000` → debe fallar).
```
