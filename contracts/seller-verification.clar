;; Seller Verification Contract
;; Validates equipment owners

(define-data-var admin principal tx-sender)

;; Map to store verified sellers
(define-map verified-sellers principal bool)

;; Error codes
(define-constant ERR-NOT-AUTHORIZED u100)
(define-constant ERR-ALREADY-VERIFIED u101)
(define-constant ERR-NOT-VERIFIED u102)

;; Function to verify a seller (only admin can call)
(define-public (verify-seller (seller principal))
  (begin
    (asserts! (is-eq tx-sender (var-get admin)) (err ERR-NOT-AUTHORIZED))
    (asserts! (is-none (map-get? verified-sellers seller)) (err ERR-ALREADY-VERIFIED))
    (map-set verified-sellers seller true)
    (ok true)))

;; Function to revoke seller verification
(define-public (revoke-verification (seller principal))
  (begin
    (asserts! (is-eq tx-sender (var-get admin)) (err ERR-NOT-AUTHORIZED))
    (asserts! (is-some (map-get? verified-sellers seller)) (err ERR-NOT-VERIFIED))
    (map-delete verified-sellers seller)
    (ok true)))

;; Function to check if a seller is verified
(define-read-only (is-verified-seller (seller principal))
  (default-to false (map-get? verified-sellers seller)))

;; Function to transfer admin rights
(define-public (transfer-admin (new-admin principal))
  (begin
    (asserts! (is-eq tx-sender (var-get admin)) (err ERR-NOT-AUTHORIZED))
    (var-set admin new-admin)
    (ok true)))
