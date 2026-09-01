# Rebelkultur Shops

Shop- und Händlerplattform für Rebelkultur mit Supabase-Backend, Authentifizierung, Händlerbereich, Kundenkonto und Stripe-Checkout-Grundlage.

## Aktueller Stand

- Responsive Marketplace-Oberfläche
- Produktsuche, Kategorien und Sortierung
- Warenkorb mit Bestandsprüfung
- Kundenkonto und Bestellübersicht
- Händler-Dashboard
- Produkte anlegen, bearbeiten und löschen
- Händlerprofil, Shop-URL und Veröffentlichung
- Händler-Bestellungen und Statusverwaltung
- Plattform-Admin mit Provisionen und Auszahlungsübersicht
- Supabase Auth + Row Level Security
- Stripe Connect Händler-Onboarding
- Stripe Checkout mit Plattformprovision
- Stripe Webhook für bezahlt, fehlgeschlagen und erstattet
- Gehärtete Zahlungsstatus- und Provisionsgrenzen in der Datenbank

## Stripe-Konfiguration

Die Stripe-Edge-Functions verwenden `STRIPE_SECRET_KEY` und `STRIPE_WEBHOOK_SECRET` als Supabase-Edge-Function-Secrets. Diese Werte gehören nicht in GitHub, den Browser-Code oder die normale Datenbank.

Die Webhook-URL lautet:

`https://oansbivjkczjbtxaknks.supabase.co/functions/v1/stripe-webhook`

## Entwicklung

Frontend-Dateien liegen im Repository-Root. Backend-Logik für Zahlungen läuft über Supabase Edge Functions. Datenbankänderungen werden als SQL-Migrationen unter `supabase/migrations/` dokumentiert.

## Wichtige Dateien

- `index.html` – Plattformoberfläche
- `app.js` – Shop-, Händler- und Checkout-Grundfunktionen
- `stripe.js` – Stripe-Connect-/Checkout-Frontend-Anbindung
- `merchant-profile.js` – Händlerprofil und Shop-Einstellungen
- `customer-account.js` – Kundenkonto und Bestellungen
- `security-patch.js` – abgesicherte Händler-Aktionen
- `supabase/migrations/` – Datenbankmigrationen
