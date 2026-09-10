# Rebelkultur Shops

Shop- und Händlerplattform für Rebelkultur mit Supabase-Backend, Authentifizierung, Händlerbereich, Kundenkonto und Stripe-Checkout.

## Aktueller Stand

- Responsive Marketplace-Oberfläche
- Produktsuche, Kategorien und Sortierung
- Warenkorb mit Bestandsprüfung
- Kundenkonto und Bestellübersicht
- Händler-Dashboard mit Kennzahlen
- Produkte anlegen, bearbeiten und löschen
- Händlerprofil, Shop-URL und Veröffentlichung
- Öffentliche Händler-Shops
- Händler-Bestellungen und Statusverwaltung
- Versanddienstleister, Tracking und Kundenbenachrichtigungen
- Plattform-Admin mit Provisionen und Auszahlungsübersicht
- Supabase Auth + Row Level Security
- Stripe Connect Händler-Onboarding
- Stripe Checkout mit Plattformprovision
- Stripe Webhook für bezahlt, fehlgeschlagen, abgelaufen und erstattet
- Gehärtete Zahlungsstatus- und Provisionsgrenzen in der Datenbank
- Händler-FAQ, Checklisten und Marketing-Bereich

## Stripe-Konfiguration

Die Stripe-Edge-Functions verwenden `STRIPE_SECRET_KEY` und `STRIPE_WEBHOOK_SECRET` als Supabase-Edge-Function-Secrets. Diese Werte gehören nicht in GitHub, den Browser-Code oder die normale Datenbank.

Die Webhook-URL lautet:

`https://oansbivjkczjbtxaknks.supabase.co/functions/v1/stripe-webhook`

## Entwicklung

Frontend-Dateien liegen im Repository-Root. Backend-Logik für Zahlungen läuft über Supabase Edge Functions. Datenbankänderungen werden als SQL-Migrationen unter `supabase/migrations/` dokumentiert.

## Wichtige Dateien

- `index.html` – Plattformoberfläche
- `app.js` – Shop- und Grundfunktionen
- `stripe.js` – Stripe-Connect-/Checkout-Frontend-Anbindung
- `merchant-profile-v2.js` – Händlerprofil
- `merchant-directory.js` – öffentliche Händlerübersicht
- `merchant-shop.js` – öffentlicher Händler-Shop
- `dashboard-overview.js` – Händler-Dashboard
- `order-management.js` – Händler-Bestellungen und Versand
- `customer-account.js` – Kundenkonto und Bestellungen
- `shop-settings.js` – Shop- und Rechtseinstellungen
- `merchant-marketing.js` – Marketing-Bereich
- `merchant-support.js` – FAQ und Support
- `checklist-repair.js` – Händler-Checkliste
- `supabase/migrations/` – Datenbankmigrationen
