-- auto-generated definition
create table invocations
(
    id         integer,
    sent_at    timestamp,
    started_at timestamp,
    group_id   text,
    batch_id   text,
    cache_id   text,
    created_at timestamp default now()
);

alter table invocations
    owner to postgres;
