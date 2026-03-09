-- データベースの作成
create database if not exists my_roll_db
character set utf8mb4 collate utf8mb4_unicode_ci;

-- ユーザに権限を付与
grant all privileges on my_roll_db.* to my_roll_user@'%';
flush privileges;

-- my_roll_dbを使用
use my_roll_db;

-- charactersテーブルの作成
create table if not exists characters (
    id int primary key auto_increment,
    name varchar(255) not null,
    description text not null,
    created_at timestamp default current_timestamp,
    updated_at timestamp default current_timestamp on update current_timestamp
);

-- google_auth_tokensテーブルの作成
create table if not exists google_auth_tokens (
    id int primary key auto_increment,
    access_token text not null,
    refresh_token text not null,
    token_expiry datetime not null,
    google_email varchar(255),
    created_at timestamp default current_timestamp,
    updated_at timestamp default current_timestamp on update current_timestamp
) engine=InnoDB default charset=utf8mb4 collate=utf8mb4_unicode_ci;

-- calendar_eventsテーブルの作成
create table if not exists calendar_events (
    id int primary key auto_increment,
    character_id int not null,
    google_event_id varchar(255) not null,
    title varchar(255) not null,
    start_time datetime not null,
    end_time datetime not null,
    recurrence varchar(20) not null default 'none',
    memo text,
    created_at timestamp default current_timestamp,
    updated_at timestamp default current_timestamp on update current_timestamp,
    foreign key (character_id) references characters(id) on delete cascade,
    index idx_character_id (character_id),
    index idx_google_event_id (google_event_id)
) engine=InnoDB default charset=utf8mb4 collate=utf8mb4_unicode_ci;