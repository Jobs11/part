ALTER TABLE part_incoming
    ADD COLUMN payment_method_id INT NULL AFTER unit,
    ADD CONSTRAINT fk_part_incoming_payment_method
        FOREIGN KEY (payment_method_id) REFERENCES category(category_id);
