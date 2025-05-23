import { describe, it, expect, beforeEach } from "vitest"

// Mock implementation for testing Clarity contracts
const mockPrincipals = {
  admin: "ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM",
  seller: "ST2CY5V39NHDPWSXMW9QDT3HC3GD6Q6XX4CFRK9AG",
  buyer: "ST2JHG361ZXG51QTKY2NQCVBPPRRE2KZB1HR05NNC",
}

// Mock state
let state = {
  admin: mockPrincipals.admin,
  feePercentage: 2, // 2%
  escrowIdCounter: 1,
  escrows: new Map(),
  balances: new Map([
    [mockPrincipals.admin, 1000000],
    [mockPrincipals.seller, 1000000],
    [mockPrincipals.buyer, 1000000],
    ["contract", 0],
  ]),
}

// Mock contract functions
const transactionEscrow = {
  createEscrow: (caller: string, seller: string, assetId: number, amount: number) => {
    const escrowId = state.escrowIdCounter
    const fee = Math.floor((amount * state.feePercentage) / 100)
    const totalAmount = amount + fee
    
    // Check if buyer has enough funds
    if ((state.balances.get(caller) || 0) < totalAmount) {
      return { type: "err", value: 104 } // ERR-INSUFFICIENT-FUNDS
    }
    
    // Transfer funds to contract
    state.balances.set(caller, (state.balances.get(caller) || 0) - totalAmount)
    state.balances.set("contract", (state.balances.get("contract") || 0) + totalAmount)
    
    // Create escrow
    state.escrows.set(escrowId, {
      seller,
      buyer: caller,
      assetId,
      amount,
      status: "pending",
      createdAt: 123, // Mock block height
    })
    
    // Increment escrow ID counter
    state.escrowIdCounter++
    
    return { type: "ok", value: escrowId }
  },
  
  completeEscrow: (caller: string, escrowId: number) => {
    const escrow = state.escrows.get(escrowId)
    
    if (!escrow) {
      return { type: "err", value: 101 } // ERR-ESCROW-NOT-FOUND
    }
    
    if (escrow.status !== "pending") {
      return { type: "err", value: 102 } // ERR-INVALID-STATUS
    }
    
    if (caller !== escrow.buyer) {
      return { type: "err", value: 100 } // ERR-NOT-AUTHORIZED
    }
    
    const fee = Math.floor((escrow.amount * state.feePercentage) / 100)
    
    // Transfer amount to seller
    state.balances.set("contract", (state.balances.get("contract") || 0) - escrow.amount - fee)
    state.balances.set(escrow.seller, (state.balances.get(escrow.seller) || 0) + escrow.amount)
    state.balances.set(state.admin, (state.balances.get(state.admin) || 0) + fee)
    
    // Update escrow status
    state.escrows.set(escrowId, {
      ...escrow,
      status: "completed",
    })
    
    return { type: "ok", value: true }
  },
  
  refundEscrow: (caller: string, escrowId: number) => {
    const escrow = state.escrows.get(escrowId)
    
    if (!escrow) {
      return { type: "err", value: 101 } // ERR-ESCROW-NOT-FOUND
    }
    
    if (escrow.status !== "pending") {
      return { type: "err", value: 102 } // ERR-INVALID-STATUS
    }
    
    if (caller !== escrow.seller && caller !== state.admin) {
      return { type: "err", value: 100 } // ERR-NOT-AUTHORIZED
    }
    
    const fee = Math.floor((escrow.amount * state.feePercentage) / 100)
    const totalAmount = escrow.amount + fee
    
    // Return full amount to buyer
    state.balances.set("contract", (state.balances.get("contract") || 0) - totalAmount)
    state.balances.set(escrow.buyer, (state.balances.get(escrow.buyer) || 0) + totalAmount)
    
    // Update escrow status
    state.escrows.set(escrowId, {
      ...escrow,
      status: "refunded",
    })
    
    return { type: "ok", value: true }
  },
  
  getEscrow: (escrowId: number) => {
    return state.escrows.get(escrowId) || null
  },
  
  updateFeePercentage: (caller: string, newPercentage: number) => {
    if (caller !== state.admin) {
      return { type: "err", value: 100 } // ERR-NOT-AUTHORIZED
    }
    
    if (newPercentage > 10) {
      return { type: "err", value: 105 } // Max 10% fee
    }
    
    state.feePercentage = newPercentage
    return { type: "ok", value: true }
  },
  
  transferAdmin: (caller: string, newAdmin: string) => {
    if (caller !== state.admin) {
      return { type: "err", value: 100 } // ERR-NOT-AUTHORIZED
    }
    
    state.admin = newAdmin
    return { type: "ok", value: true }
  },
}

describe("Transaction Escrow Contract", () => {
  beforeEach(() => {
    // Reset state before each test
    state = {
      admin: mockPrincipals.admin,
      feePercentage: 2, // 2%
      escrowIdCounter: 1,
      escrows: new Map(),
      balances: new Map([
        [mockPrincipals.admin, 1000000],
        [mockPrincipals.seller, 1000000],
        [mockPrincipals.buyer, 1000000],
        ["contract", 0],
      ]),
    }
  })
  
  it("should create an escrow successfully", () => {
    const amount = 1000
    const result = transactionEscrow.createEscrow(
        mockPrincipals.buyer,
        mockPrincipals.seller,
        1, // Asset ID
        amount,
    )
    
    expect(result).toEqual({ type: "ok", value: 1 })
    expect(state.escrowIdCounter).toBe(2)
    
    const escrow = transactionEscrow.getEscrow(1)
    expect(escrow).toEqual({
      seller: mockPrincipals.seller,
      buyer: mockPrincipals.buyer,
      assetId: 1,
      amount: 1000,
      status: "pending",
      createdAt: 123,
    })
    
    // Check balances
    const fee = Math.floor((amount * state.feePercentage) / 100)
    expect(state.balances.get(mockPrincipals.buyer)).toBe(1000000 - amount - fee)
    expect(state.balances.get("contract")).toBe(amount + fee)
  })
  
  it("should complete an escrow successfully", () => {
    // First create an escrow
    const amount = 1000
    transactionEscrow.createEscrow(
        mockPrincipals.buyer,
        mockPrincipals.seller,
        1, // Asset ID
        amount,
    )
    
    // Then complete it
    const result = transactionEscrow.completeEscrow(mockPrincipals.buyer, 1)
    expect(result).toEqual({ type: "ok", value: true })
    
    const escrow = transactionEscrow.getEscrow(1)
    expect(escrow.status).toBe("completed")
    
    // Check balances
    const fee = Math.floor((amount * state.feePercentage) / 100)
    expect(state.balances.get(mockPrincipals.seller)).toBe(1000000 + amount)
    expect(state.balances.get(state.admin)).toBe(1000000 + fee)
    expect(state.balances.get("contract")).toBe(0)
  })
  
  it("should refund an escrow successfully", () => {
    // First create an escrow
    const amount = 1000
    transactionEscrow.createEscrow(
        mockPrincipals.buyer,
        mockPrincipals.seller,
        1, // Asset ID
        amount,
    )
    
    // Initial buyer balance after escrow creation
    const initialBuyerBalance = state.balances.get(mockPrincipals.buyer)
    
    // Then refund it
    const result = transactionEscrow.refundEscrow(mockPrincipals.seller, 1)
    expect(result).toEqual({ type: "ok", value: true })
    
    const escrow = transactionEscrow.getEscrow(1)
    expect(escrow.status).toBe("refunded")
    
    // Check balances - buyer should get full amount back
    expect(state.balances.get(mockPrincipals.buyer)).toBe(1000000)
    expect(state.balances.get("contract")).toBe(0)
  })
  
  it("should fail to complete escrow if not the buyer", () => {
    // First create an escrow
    transactionEscrow.createEscrow(
        mockPrincipals.buyer,
        mockPrincipals.seller,
        1, // Asset ID
        1000,
    )
    
    // Try to complete it as the seller
    const result = transactionEscrow.completeEscrow(mockPrincipals.seller, 1)
    expect(result).toEqual({ type: "err", value: 100 }) // ERR-NOT-AUTHORIZED
    
    // Escrow should still be pending
    const escrow = transactionEscrow.getEscrow(1)
    expect(escrow.status).toBe("pending")
  })
  
  it("should update fee percentage successfully", () => {
    const result = transactionEscrow.updateFeePercentage(mockPrincipals.admin, 5)
    expect(result).toEqual({ type: "ok", value: true })
    expect(state.feePercentage).toBe(5)
  })
  
  it("should fail to update fee percentage if not admin", () => {
    const result = transactionEscrow.updateFeePercentage(mockPrincipals.seller, 5)
    expect(result).toEqual({ type: "err", value: 100 }) // ERR-NOT-AUTHORIZED
    expect(state.feePercentage).toBe(2) // Unchanged
  })
})
