-- ============================================
-- TERANGA PALACE — Création des tables
-- À exécuter dans Supabase : SQL Editor > New query
-- ============================================

create table utilisateurs (
    id bigint generated always as identity primary key,
    nom text not null,
    prenom text not null,
    login text unique not null,
    "motDePasse" text not null,
    email text,
    role text default 'Administrateur',
    "statutCompte" text default 'Actif',
    created_at timestamptz default now()
);

create table clients (
    id bigint generated always as identity primary key,
    nom text not null,
    prenom text,
    telephone text,
    email text,
    adresse text,
    created_at timestamptz default now()
);

create table chambres (
    id bigint generated always as identity primary key,
    numero text not null,
    categorie text,
    tarif numeric,
    statut text default 'Disponible',
    created_at timestamptz default now()
);

create table reservations (
    id bigint generated always as identity primary key,
    client_id bigint references clients(id) on delete set null,
    chambre_id bigint references chambres(id) on delete set null,
    date_arrivee date,
    date_depart date,
    statut text default 'Confirmée',
    created_at timestamptz default now()
);

create table sejours (
    id bigint generated always as identity primary key,
    reservation_id bigint references reservations(id) on delete set null,
    statut text default 'Séjour prévu',
    created_at timestamptz default now()
);

create table paiements (
    id bigint generated always as identity primary key,
    reservation_id bigint references reservations(id) on delete set null,
    montant numeric default 0,
    montant_restant numeric default 0,
    date_paiement date,
    created_at timestamptz default now()
);

create table factures (
    id bigint generated always as identity primary key,
    sejour_id bigint references sejours(id) on delete set null,
    montant_total numeric default 0,
    date_facture date,
    created_at timestamptz default now()
);

create table activites (
    id bigint generated always as identity primary key,
    nom text not null,
    description text,
    prix numeric,
    created_at timestamptz default now()
);

-- Compte Super Administrateur de départ (à modifier ensuite)
insert into utilisateurs (nom, prenom, login, "motDePasse", email, role, "statutCompte")
values ('Diallo', 'Mounir', 'admin', 'admin123', 'admin@terangapalace.com', 'Super Administrateur', 'Actif');

-- ⚠️ Pense à activer Row Level Security (RLS) et à définir des policies
-- adaptées avant de mettre l'application en production.
