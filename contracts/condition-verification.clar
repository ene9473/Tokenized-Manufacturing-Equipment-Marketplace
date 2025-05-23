;; Condition Verification Contract
;; Validates equipment status

(define-data-var admin principal tx-sender)

;; Define condition status types
(define-constant CONDITION-EXCELLENT u5)
(define-constant CONDITION-GOOD u4)
(define-constant CONDITION-FAIR u3)
(define-constant CONDITION-POOR u2)
(define-constant CONDITION-BROKEN u1)

;; Map to store asset conditions
(define-map asset-conditions
  { asset-id: uint }
  {
    condition: uint,
    details: (string-ascii 256),
    verified-by: principal,
    verified-at: uint
  }
)

;; Map to store authorized verifiers
(define-map authorized-verifiers principal bool)

;; Error codes
(define-constant ERR-NOT-AUTHORIZED u100)
(define-constant ERR-INVALID-CONDITION u101)
(define-constant ERR-NOT-VERIFIER u102)

;; Function to add an authorized verifier
(define-public (add-verifier (verifier principal))
  (begin
    (asserts! (is-eq tx-sender (var-get admin)) (err ERR-NOT-AUTHORIZED))
    (map-set authorized-verifiers verifier true)
    (ok true)))

;; Function to remove a verifier
(define-public (remove-verifier (verifier principal))
  (begin
    (asserts! (is-eq tx-sender (var-get admin)) (err ERR-NOT-AUTHORIZED))
    (map-delete authorized-verifiers verifier)
    (ok true)))

;; Function to verify asset condition
(define-public (verify-condition
    (asset-id uint)
    (condition uint)
    (details (string-ascii 256)))
  (begin
    (asserts! (default-to false (map-get? authorized-verifiers tx-sender)) (err ERR-NOT-VERIFIER))
    (asserts! (and (>= condition CONDITION-BROKEN) (<= condition CONDITION-EXCELLENT)) (err ERR-INVALID-CONDITION))
    (map-set asset-conditions
      { asset-id: asset-id }
      {
        condition: condition,
        details: details,
        verified-by: tx-sender,
        verified-at: block-height
      }
    )
    (ok true)))

;; Function to get asset condition
(define-read-only (get-asset-condition (asset-id uint))
  (map-get? asset-conditions { asset-id: asset-id }))

;; Function to check if a principal is an authorized verifier
(define-read-only (is-authorized-verifier (verifier principal))
  (default-to false (map-get? authorized-verifiers verifier)))

;; Function to transfer admin rights
(define-public (transfer-admin (new-admin principal))
  (begin
    (asserts! (is-eq tx-sender (var-get admin)) (err ERR-NOT-AUTHORIZED))
    (var-set admin new-admin)
    (ok true)))
