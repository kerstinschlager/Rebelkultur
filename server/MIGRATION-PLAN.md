# Zorqemi – eigener Online-Server

## Ziel
Zorqemi wird schrittweise aus der heutigen Supabase/GitHub-Struktur in eine selbst verwaltete Server-Infrastruktur überführt. Der bestehende Live-Betrieb bleibt während der Migration erhalten.

## Reihenfolge
1. **Server-Basis:** Docker, Nginx, HTTPS, Firewall, Monitoring und Backups.
2. **Web:** Zorqemi-Frontend als Container auf dem eigenen Server.
3. **Datenbank:** PostgreSQL auf dem eigenen Server; Schema und Daten aus Supabase übernehmen.
4. **Authentifizierung:** eigene Auth-Schicht mit sicheren Sessions und Passwort-Reset.
5. **API:** bestehende Datenzugriffe kontrolliert auf eine eigene API umstellen.
6. **Zahlungen:** Stripe bleibt zunächst externer Zahlungsdienst; Webhooks laufen über die eigene API.
7. **Integrationen:** Printify und Spreadconnect über die eigene Server-API anbinden.
8. **Analytics:** Checkout-, Besucher- und Händlerstatistiken auf die eigene Datenhaltung umstellen.
9. **Parallelbetrieb:** jede Komponente erst testen, dann umschalten.
10. **Abschaltung Supabase:** erst nach erfolgreicher Abnahme aller Funktionen.

## Grundregel
Keine Big-Bang-Migration. Bestehende Zorqemi-Funktionen, Daten und Sicherheitsregeln werden vor jedem Umschalten geprüft.

## Aktueller Stand
Der erste Server-Baustein ist vorbereitet: Das Zorqemi-Frontend kann als Docker-Container mit Nginx betrieben werden und besitzt einen `/healthz`-Healthcheck.

## Noch erforderlich
Für den echten Online-Betrieb benötigen wir einen eigenen Server/Root-Server mit öffentlicher IP und eine Domain-DNS-Konfiguration. Diese Zugangsdaten werden nicht im GitHub-Repository gespeichert.
