COMPOSE = docker compose --env-file ../.env -f compose.yml

.PHONY: up down reload console

up:
	$(COMPOSE) up --build

down:
	$(COMPOSE) down

reload:
	$(COMPOSE) restart app

console:
	$(COMPOSE) run --rm app sh
