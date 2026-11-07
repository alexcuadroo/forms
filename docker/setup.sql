\getenv app_password FORMS_DB_PASSWORD
BEGIN;
DO $$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'forms_app') THEN
    CREATE ROLE forms_app LOGIN;
  END IF;
END $$;
ALTER ROLE forms_app WITH LOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION NOBYPASSRLS PASSWORD :'app_password';
GRANT CONNECT ON DATABASE forms TO forms_app;
GRANT USAGE, CREATE ON SCHEMA public TO forms_app;

-- En volúmenes anteriores las tablas de la aplicación pertenecen a forms.
SELECT format('ALTER TABLE public.%I OWNER TO forms_app', tablename)
FROM pg_tables
WHERE schemaname = 'public' AND tableowner = 'forms'
  AND tablename IN ('owners', 'forms', 'versions', 'responses', 'files', 'trash')
\gexec
COMMIT;
