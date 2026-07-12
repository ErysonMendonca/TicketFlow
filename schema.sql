CREATE DATABASE IF NOT EXISTS ticketflow_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE ticketflow_db;

-- Tabela de Usuários
CREATE TABLE IF NOT EXISTS users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL,
    role VARCHAR(50) NOT NULL DEFAULT 'user', -- admin, dev, user
    avatar VARCHAR(500),
    is_online BOOLEAN DEFAULT FALSE,
    setor_id INT NULL, -- setor ao qual o usuário pertence (origem dos tickets que ele abre); FK add via migration
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabela de Setores (unidade organizacional principal; ex: TI, Financeiro)
-- Setor SEM sistemas é atendido pela sua própria equipe (primary_responsibles).
-- Setor COM sistemas ramifica em `systems`, cada um com seu responsável.
CREATE TABLE IF NOT EXISTS setores (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL UNIQUE,
    primary_responsibles JSON NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabela de Sistemas (ramificações de um setor; ex: sistemas dentro do TI)
CREATE TABLE IF NOT EXISTS systems (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL UNIQUE,
    primary_responsibles JSON NULL,
    setor_id INT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (setor_id) REFERENCES setores(id) ON DELETE SET NULL
);

-- Tabela de Tickets
CREATE TABLE IF NOT EXISTS tickets (
    id INT AUTO_INCREMENT PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    setor_id INT NULL, -- destino do ticket: o setor responsável
    origin_setor_id INT NULL, -- setor de ORIGEM (de quem abriu); ticket sempre vai p/ OUTRO setor
    platform VARCHAR(255) NULL, -- id do sistema/categoria dentro do setor (quando o setor ramifica); NULL p/ setor sem categorias
    status VARCHAR(50) NOT NULL DEFAULT 'backlog', -- backlog, doing, test, done
    urgency VARCHAR(50) NOT NULL DEFAULT 'leve', -- urgente, leve, etc
    ticket_type VARCHAR(50) NULL, -- definido na Análise: bug | melhoria
    responsible VARCHAR(255) NULL,
    delivery_date DATE NULL, -- prazo de entrega da solução, definido ao aceitar o ticket
    created_by INT NULL,
    attachments JSON NULL,
    dev_notes TEXT NULL,
    shared_with JSON NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL,
    FOREIGN KEY (setor_id) REFERENCES setores(id) ON DELETE SET NULL,
    FOREIGN KEY (origin_setor_id) REFERENCES setores(id) ON DELETE SET NULL
);

-- Tabela de Logs do Sistema
CREATE TABLE IF NOT EXISTS system_logs (
    id INT AUTO_INCREMENT PRIMARY KEY,
    ticket_id INT NULL,
    action_type VARCHAR(255) NOT NULL,
    old_value VARCHAR(255) NULL,
    new_value VARCHAR(255) NULL,
    actor_name VARCHAR(255) NOT NULL,
    actor_role VARCHAR(50) NOT NULL,
    details TEXT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (ticket_id) REFERENCES tickets(id) ON DELETE CASCADE
);

-- Tabela de Mensagens do Chat Interno (Comentários nos Tickets)
CREATE TABLE IF NOT EXISTS ticket_messages (
    id INT AUTO_INCREMENT PRIMARY KEY,
    ticket_id INT NOT NULL,
    user_id INT NOT NULL,
    message TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (ticket_id) REFERENCES tickets(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Dados de Exemplo Base
INSERT IGNORE INTO users (name, email, password, role) VALUES
('Administrador', 'admin@ticketflow.com', 'admin123', 'admin');

-- Setor base (a ramificação de TI abriga os sistemas)
INSERT IGNORE INTO setores (name) VALUES ('TI');
