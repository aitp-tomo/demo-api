CREATE TABLE messages (
    ID BIGINT UNSIGNED PRIMARY KEY comment 'ID',
    content VARCHAR(1000) NOT NULL comment '内容',
    user_id VARCHAR(80) NOT NULL comment 'ユーザーID',
    created_at DATETIME comment '登録日時' DEFAULT current_timestamp NOT NULL,
    created_by VARCHAR(80) comment '登録者ID' NOT NULL
);