CREATE TABLE messages (
    ID BIGINT UNSIGNED PRIMARY KEY comment 'ID',
    content VARCHAR(1000) NOT NULL comment '内容',
    user_id VARCHAR(80) NOT NULL comment 'ユーザーID',
    created_at DATETIME comment '登録日時' DEFAULT current_timestamp NOT NULL,
    updated_at VARCHAR(80) comment '更新日時' DEFAULT current_timestamp ON UPDATE current_timestamp NOT NULL
);