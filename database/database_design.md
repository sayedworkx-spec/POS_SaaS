# Database Design

## Companies

| Field | Type |
|---------|---------|
| id | Number |
| company_name | Text |
| subscription_status | Text |
| subscription_end_date | Date |

---

## Users

| Field | Type |
|---------|---------|
| id | Number |
| company_id | Number |
| username | Text |
| email | Text |
| password_hash | Text |
| role | Text |
| is_active | Boolean |

---

## Products

| Field | Type |
|---------|---------|
| id | Number |
| company_id | Number |
| sku | Text |
| barcode | Text |
| name_en | Text |
| name_ar | Text |
| price | Decimal |
| quantity | Number |
| is_active | Boolean |

---

## Sales

| Field | Type |
|---------|---------|
| id | Number |
| company_id | Number |
| invoice_number | Text |
| user_id | Number |
| total_amount | Decimal |
| created_at | DateTime |

---

## SaleItems

| Field | Type |
|---------|---------|
| id | Number |
| sale_id | Number |
| product_id | Number |
| quantity | Number |
| unit_price | Decimal |
| line_total | Decimal |



---------------------------------------------------

Companies
    |
    +---- Users

Companies
    |
    +---- Products

Companies
    |
    +---- Sales

Sales
    |
    +---- SaleItems

Products
    |
    +---- SaleItems