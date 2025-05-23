;; Transaction Escrow Contract
;; Manages secure payment

(define-data-var admin principal tx-sender)
(define-data-var fee-percentage uint u2) ;; 2% fee

;; Define escrow structure
(define-map escrows
  { escrow-id: uint }
  {
    seller: principal,
    buyer: principal,
    asset-id: uint,
    amount: uint,
    status: (string-ascii 20), ;; "pending", "completed", "refunded", "disputed"
    created-at: uint
  }
)

;; Counter for escrow IDs
(define-data-var escrow-id-counter uint u1)

;; Error codes
(define-constant ERR-NOT-AUTHORIZED u100)
(define-constant ERR-ESCROW-NOT-FOUND u101)
(define-constant ERR-INVALID-STATUS u102)
(define-constant ERR-NOT-BUYER-OR-SELLER u103)
(define-constant ERR-INSUFFICIENT-FUNDS u104)

;; Function to create an escrow
(define-public (create-escrow (seller principal) (asset-id uint) (amount uint))
  (let
    (
      (escrow-id (var-get escrow-id-counter))
      (total-amount (+ amount (/ (* amount (var-get fee-percentage)) u100)))
    )
    (asserts! (>= (stx-get-balance tx-sender) total-amount) (err ERR-INSUFFICIENT-FUNDS))
    (try! (stx-transfer? total-amount tx-sender (as-contract tx-sender)))
    (map-set escrows
      { escrow-id: escrow-id }
      {
        seller: seller,
        buyer: tx-sender,
        asset-id: asset-id,
        amount: amount,
        status: "pending",
        created-at: block-height
      }
    )
    (var-set escrow-id-counter (+ escrow-id u1))
    (ok escrow-id)))

;; Function to complete an escrow (release funds to seller)
(define-public (complete-escrow (escrow-id uint))
  (let
    (
      (escrow (unwrap! (map-get? escrows { escrow-id: escrow-id }) (err ERR-ESCROW-NOT-FOUND)))
      (fee (/ (* (get amount escrow) (var-get fee-percentage)) u100))
    )
    (asserts! (is-eq (get status escrow) "pending") (err ERR-INVALID-STATUS))
    (asserts! (is-eq tx-sender (get buyer escrow)) (err ERR-NOT-AUTHORIZED))

    ;; Transfer amount to seller
    (try! (as-contract (stx-transfer? (get amount escrow) tx-sender (get seller escrow))))

    ;; Transfer fee to admin
    (try! (as-contract (stx-transfer? fee tx-sender (var-get admin))))

    ;; Update escrow status
    (map-set escrows
      { escrow-id: escrow-id }
      (merge escrow { status: "completed" })
    )
    (ok true)))

;; Function to refund an escrow (return funds to buyer)
(define-public (refund-escrow (escrow-id uint))
  (let
    (
      (escrow (unwrap! (map-get? escrows { escrow-id: escrow-id }) (err ERR-ESCROW-NOT-FOUND)))
      (total-amount (+ (get amount escrow) (/ (* (get amount escrow) (var-get fee-percentage)) u100)))
    )
    (asserts! (is-eq (get status escrow) "pending") (err ERR-INVALID-STATUS))
    (asserts! (or (is-eq tx-sender (get seller escrow)) (is-eq tx-sender (var-get admin))) (err ERR-NOT-AUTHORIZED))

    ;; Return full amount to buyer
    (try! (as-contract (stx-transfer? total-amount tx-sender (get buyer escrow))))

    ;; Update escrow status
    (map-set escrows
      { escrow-id: escrow-id }
      (merge escrow { status: "refunded" })
    )
    (ok true)))

;; Function to get escrow details
(define-read-only (get-escrow (escrow-id uint))
  (map-get? escrows { escrow-id: escrow-id }))

;; Function to update fee percentage (only admin)
(define-public (update-fee-percentage (new-percentage uint))
  (begin
    (asserts! (is-eq tx-sender (var-get admin)) (err ERR-NOT-AUTHORIZED))
    (asserts! (<= new-percentage u10) (err u105)) ;; Max 10% fee
    (var-set fee-percentage new-percentage)
    (ok true)))

;; Function to transfer admin rights
(define-public (transfer-admin (new-admin principal))
  (begin
    (asserts! (is-eq tx-sender (var-get admin)) (err ERR-NOT-AUTHORIZED))
    (var-set admin new-admin)
    (ok true)))
