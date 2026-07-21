# Durcissement sécurité — VPS Hetzner (UrbanFlow Mobility)

Ce document est un historique fidèle des mesures **réellement appliquées et vérifiées**
sur le VPS de production, pas une liste d'intentions. Chaque section n'est marquée
**✅ Fait** que lorsque l'utilisateur (seul détenteur d'un accès SSH au serveur) a
confirmé le résultat réel d'une commande. Tant qu'aucune confirmation n'a été donnée,
la section reste **⏳ En attente**.

Contexte : le filtrage réseau (ufw + Cloud Firewall Hetzner) est déjà en place et vérifié
(Bug 14 du dossier) — ce document ne couvre que le durcissement de l'accès au serveur
lui-même (SSH, brute-force, mises à jour), avant ouverture à des testeurs externes.

**Règle non négociable respectée pendant tout le durcissement SSH** : aucune session SSH
active n'a été fermée avant qu'une nouvelle connexion, dans les conditions finales
(clé uniquement, root désactivé), ait été validée depuis un second terminal.

---

## 1. Authentification SSH par clé uniquement

**Statut : ✅ Fait — confirmé**

Fichier cible : [`sshd-99-hardening.conf`](./sshd-99-hardening.conf), à copier vers
`/etc/ssh/sshd_config.d/99-hardening.conf`.

```
PubkeyAuthentication yes
PasswordAuthentication no
PermitRootLogin prohibit-password
KbdInteractiveAuthentication no
ChallengeResponseAuthentication no
```

`PermitRootLogin prohibit-password` (et non `no`) est un choix délibéré, pas un
compromis : root ne peut jamais se connecter par mot de passe, mais reste joignable par
clé — conservé comme accès de secours si le compte `urbanflow` est un jour bloqué.
Décision prise le 2026-07-21 après confirmation que c'était déjà la valeur active.

| Date | Commande | Résultat confirmé par l'utilisateur |
|------|----------|--------------------------------------|
| 2026-07-21 | `sudo sshd -T \| grep -i passwordauthentication` | `passwordauthentication no` — confirmé |
| 2026-07-21 | `sudo sshd -T \| grep -i permitrootlogin` | `permitrootlogin prohibit-password` — confirmé, conservé volontairement |

---

## 2. fail2ban — protection anti brute-force SSH

**Statut : ✅ Fait — confirmé, avec un bannissement réel observé**

Fichier cible : [`jail.local`](./jail.local), à copier vers `/etc/fail2ban/jail.local`.

### Pourquoi `backend = systemd` (et pas une supposition)

Les images Ubuntu récentes sur Hetzner n'installent pas toujours `rsyslog` par défaut —
sans lui, `/var/log/auth.log` n'existe pas et SSH ne logue que dans `journald`. Plutôt que
de supposer, **vérifier d'abord** :

```bash
test -f /var/log/auth.log && echo "fichier présent" || echo "absent"
systemctl is-active rsyslog
```

`backend = systemd` (retenu dans `jail.local`) fonctionne dans les deux cas — que le
fichier existe ou non, `fail2ban` lit directement `journald`. C'est pourquoi ce backend
a été choisi explicitement plutôt que de laisser la valeur par défaut du paquet.

### Procédure

IP déjà whitelistées dans [`jail.local`](./jail.local) (confirmées le 2026-07-21, avant
toute installation) : `90.63.18.239` et `83.228.240.109`.

```bash
# 1. Installer
sudo apt update
sudo apt install -y fail2ban

# 2. Copier le fichier (ignoreip déjà à jour avec les IPs whitelistées)
sudo cp jail.local /etc/fail2ban/jail.local

# 3. Redémarrer le service
sudo systemctl restart fail2ban
sudo systemctl enable fail2ban

# 4. Vérification (À ME FAIRE CONFIRMER avec le résultat réel)
sudo fail2ban-client status sshd
```

**Résultat attendu** : la jail `sshd` doit apparaître active, avec `Currently banned: 0`
et `Total banned: 0`. Ça suffit à prouver que la jail est fonctionnelle — **aucun besoin
de provoquer un vrai bannissement** pour valider cette étape.

### Si tu veux quand même tester un vrai bannissement (optionnel, avec précaution)

⚠️ **Ne jamais faire ce test depuis l'IP/la session que tu utilises pour administrer le
serveur** — c'est exactement le genre d'erreur que `maxretry = 5` ne pardonne pas.

- Utilise un réseau que tu n'as pas besoin de garder (ex. partage de connexion 4G d'un
  téléphone), **pas ajouté à `ignoreip`**.
- Depuis ce réseau uniquement : tente une connexion SSH avec un mauvais mot de passe/une
  mauvaise clé, 6 fois de suite (dépasse `maxretry = 5`).
- Depuis ta session habituelle (le terminal que tu utilises déjà) :
  ```bash
  sudo fail2ban-client status sshd
  ```
  L'IP du réseau de test doit apparaître dans "Banned IP list".
- Pour la débannir ensuite si besoin :
  ```bash
  sudo fail2ban-client set sshd unbanip <IP>
  ```

| Date | Commande | Résultat confirmé par l'utilisateur |
|------|----------|--------------------------------------|
| 2026-07-21 | `sudo fail2ban-client status sshd` | Jail active, `Journal matches: _SYSTEMD_UNIT=ssh.service + _COMM=sshd` (confirme le backend `systemd`) ; `Currently banned: 1`, `Total banned: 1`, IP `171.243.150.251` — un vrai scanner internet, pas une des IPs whitelistées (`90.63.18.239`/`83.228.240.109`) ni une IP connue de l'utilisateur : preuve en conditions réelles que la jail fonctionne, aucun test synthétique nécessaire |

---

## 3. unattended-upgrades — mises à jour de sécurité automatiques

**Statut : ✅ Fait — confirmé**

Fichiers cibles :
- [`50unattended-upgrades`](./50unattended-upgrades) → `/etc/apt/apt.conf.d/50unattended-upgrades`
- [`20auto-upgrades`](./20auto-upgrades) → `/etc/apt/apt.conf.d/20auto-upgrades`

### Pourquoi ça ne touchera pas Docker

`Unattended-Upgrade::Allowed-Origins` est volontairement restreint aux pockets
`-security` (Ubuntu + ESM). Docker est installé depuis le dépôt tiers
`download.docker.com`, dont l'origine ne correspond à **aucune** des lignes autorisées —
il est donc exclu par construction, pas par une règle spéciale. `Automatic-Reboot` est
aussi mis à `false` pour éviter un redémarrage surprise du VPS.

### Procédure

```bash
# 1. Installer
sudo apt update
sudo apt install -y unattended-upgrades apt-listchanges

# 2. Sauvegarder l'original avant de l'écraser
sudo cp /etc/apt/apt.conf.d/50unattended-upgrades \
        /etc/apt/apt.conf.d/50unattended-upgrades.bak.$(date +%Y%m%d)

# 3. Copier les fichiers du repo
sudo cp 50unattended-upgrades /etc/apt/apt.conf.d/50unattended-upgrades
sudo cp 20auto-upgrades /etc/apt/apt.conf.d/20auto-upgrades

# 4. Vérification (À ME FAIRE CONFIRMER avec la sortie réelle)
sudo unattended-upgrade --dry-run --debug
```

**Ce qu'il faut chercher dans la sortie (pas juste "ça n'a pas planté")** :

1. Une ligne listant les origines autorisées (`Allowed origins are: ...` ou équivalent) —
   elle ne doit contenir **que** des entrées `*-security`, jamais `-updates` ni
   `-backports` ni le pocket de base sans suffixe.
2. Les lignes `Checking: <paquet> (...)` : si des paquets sont candidats à la mise à
   jour, vérifier qu'aucun ne s'appelle `docker*`, `containerd*` ou
   `docker-compose-plugin` — ils ne doivent jamais apparaître, precisément parce que
   leur origine (`download.docker.com`) n'est pas dans `Allowed-Origins`.
3. Une ligne finale du type "no packages found that can be upgraded" (rien en attente
   actuellement) ou la liste exacte des paquets `*-security` qui seraient appliqués.

Ensuite, confirmer que le timer est bien programmé (pas juste configuré) :

```bash
systemctl status apt-daily-upgrade.timer
# attendu : Active: active (waiting)
```

| Date | Commande | Résultat confirmé par l'utilisateur |
|------|----------|--------------------------------------|
| 2026-07-21 | `sudo unattended-upgrade --dry-run --debug` | `Allowed origins are: o=Ubuntu,a=resolute-security, o=UbuntuESMApps,a=resolute-apps-security, o=UbuntuESM,a=resolute-infra-security` (exactement les 3 origines sécurité configurées) ; le paquet Docker (`download.docker.com`) est explicitement `Marking not allowed ... with -32768 pin` ; paquets candidats : `libfreetype6, libsqlite3-0, linux-image-virtual, linux-libc-dev, openssh-client, openssh-server, openssh-sftp-server, wget` — aucun `docker*`/`containerd*` |
| 2026-07-21 | `grep "$(date +%Y-%m-%d)" /var/log/dpkg.log` | Vérification complémentaire car le `--debug` affichait des lignes `dpkg --unpack`/`--configure` ressemblant à une exécution réelle : le log ne contient que l'installation de `fail2ban` (+deps) et `apt-listchanges` du jour — **aucune trace** de `openssh-server`/`libsqlite3-0`/etc. Confirme que le `--dry-run` n'a rien appliqué réellement |

| 2026-07-21 | `systemctl status apt-daily-upgrade.timer` | `Active: active (waiting)`, `Loaded: ... enabled`, prochain déclenchement dans 9h — le timer périodique est bien actif, pas seulement configuré |

---

## 4. Vérification croisée finale (contrôle uniquement, aucune nouvelle règle)

À relancer après **chaque** changement ci-dessus, pour confirmer qu'aucune régression
n'a été introduite sur le périmètre réseau déjà validé (Bug 14) :

```bash
# Le port Docker ne doit JAMAIS être exposé publiquement
sudo ss -tlnp | grep -E ':2375|:2376'
# attendu : aucune sortie (ou une sortie liée uniquement à 127.0.0.1/::1, jamais 0.0.0.0)

# Rappel de la liste attendue des ports ouverts (ufw + Cloud Firewall Hetzner) :
# 22 (SSH), 80/443 (Caddy), 25565/24454 (Minecraft, préexistant)
sudo ufw status numbered
```

| Date | Commande | Résultat confirmé par l'utilisateur |
|------|----------|--------------------------------------|
| 2026-07-21 | `sudo ss -tlnp \| grep -E ':2375\|:2376'` | Aucune sortie — Docker n'écoute nulle part sur ces ports (pas juste bloqué par le firewall, réellement pas exposé en TCP) |
| 2026-07-21 | `sudo ufw status numbered` | `22/tcp`, `25565/tcp`, `80/tcp`, `443/tcp` (+ équivalents v6) — actif |

**Écart constaté sur le port `24454`, résolu** : absent de ce `ufw status` — confirmé par
l'utilisateur comme normal (non lié à une régression de cette session de durcissement).

---

## Journal complet

| # | Mesure | Statut | Date | Vérifié par |
|---|--------|--------|------|-------------|
| 1 | SSH — `PasswordAuthentication no` | ✅ Fait | 2026-07-21 | utilisateur (`sudo sshd -T`) |
| 1b | SSH — `PermitRootLogin prohibit-password` (conservé volontairement) | ✅ Fait | 2026-07-21 | utilisateur (`sudo sshd -T`) |
| 2 | fail2ban — IP whitelistées (`90.63.18.239`, `83.228.240.109`) | ✅ Fait | 2026-07-21 | utilisateur |
| 2b | fail2ban — jail `sshd` active (bannissement réel observé : `171.243.150.251`) | ✅ Fait | 2026-07-21 | utilisateur (`sudo fail2ban-client status sshd`) |
| 3 | unattended-upgrades — sécurité uniquement, Docker exclu par construction | ✅ Fait | 2026-07-21 | utilisateur (`--dry-run --debug` + `dpkg.log`) |
| 3b | unattended-upgrades — timer `apt-daily-upgrade.timer` actif | ✅ Fait | 2026-07-21 | utilisateur (`systemctl status apt-daily-upgrade.timer`) |
| 4a | Port Docker 2375/2376 non exposé | ✅ Fait | 2026-07-21 | utilisateur (`sudo ss -tlnp`) |
| 4b | Périmètre ufw (22/80/443/25565) | ✅ Fait | 2026-07-21 | utilisateur (`sudo ufw status numbered`) — absence de `24454` confirmée normale |
