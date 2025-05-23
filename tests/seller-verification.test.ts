import { describe, it, expect, beforeEach } from "vitest"

// Mock implementation for testing Clarity contracts
const mockPrincipals = {
  admin: "ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM",
  seller1: "ST2CY5V39NHDPWSXMW9QDT3HC3GD6Q6XX4CFRK9AG",
  seller2: "ST2JHG361ZXG51QTKY2NQCVBPPRRE2KZB1HR05NNC",
}

// Mock state
let state = {
  admin: mockPrincipals.admin,
  verifiedSellers: new Map(),
}

// Mock contract functions
const sellerVerification = {
  verifySeller: (caller: string, seller: string) => {
    if (caller !== state.admin) {
      return { type: "err", value: 100 } // ERR-NOT-AUTHORIZED
    }
    
    if (state.verifiedSellers.has(seller)) {
      return { type: "err", value: 101 } // ERR-ALREADY-VERIFIED
    }
    
    state.verifiedSellers.set(seller, true)
    return { type: "ok", value: true }
  },
  
  revokeVerification: (caller: string, seller: string) => {
    if (caller !== state.admin) {
      return { type: "err", value: 100 } // ERR-NOT-AUTHORIZED
    }
    
    if (!state.verifiedSellers.has(seller)) {
      return { type: "err", value: 102 } // ERR-NOT-VERIFIED
    }
    
    state.verifiedSellers.delete(seller)
    return { type: "ok", value: true }
  },
  
  isVerifiedSeller: (seller: string) => {
    return state.verifiedSellers.has(seller)
  },
  
  transferAdmin: (caller: string, newAdmin: string) => {
    if (caller !== state.admin) {
      return { type: "err", value: 100 } // ERR-NOT-AUTHORIZED
    }
    
    state.admin = newAdmin
    return { type: "ok", value: true }
  },
}

describe("Seller Verification Contract", () => {
  beforeEach(() => {
    // Reset state before each test
    state = {
      admin: mockPrincipals.admin,
      verifiedSellers: new Map(),
    }
  })
  
  it("should verify a seller successfully", () => {
    const result = sellerVerification.verifySeller(mockPrincipals.admin, mockPrincipals.seller1)
    expect(result).toEqual({ type: "ok", value: true })
    expect(sellerVerification.isVerifiedSeller(mockPrincipals.seller1)).toBe(true)
  })
  
  it("should fail to verify a seller if not admin", () => {
    const result = sellerVerification.verifySeller(mockPrincipals.seller1, mockPrincipals.seller2)
    expect(result).toEqual({ type: "err", value: 100 }) // ERR-NOT-AUTHORIZED
  })
  
  it("should fail to verify a seller that is already verified", () => {
    sellerVerification.verifySeller(mockPrincipals.admin, mockPrincipals.seller1)
    const result = sellerVerification.verifySeller(mockPrincipals.admin, mockPrincipals.seller1)
    expect(result).toEqual({ type: "err", value: 101 }) // ERR-ALREADY-VERIFIED
  })
  
  it("should revoke verification successfully", () => {
    sellerVerification.verifySeller(mockPrincipals.admin, mockPrincipals.seller1)
    const result = sellerVerification.revokeVerification(mockPrincipals.admin, mockPrincipals.seller1)
    expect(result).toEqual({ type: "ok", value: true })
    expect(sellerVerification.isVerifiedSeller(mockPrincipals.seller1)).toBe(false)
  })
  
  it("should fail to revoke verification if not admin", () => {
    sellerVerification.verifySeller(mockPrincipals.admin, mockPrincipals.seller1)
    const result = sellerVerification.revokeVerification(mockPrincipals.seller2, mockPrincipals.seller1)
    expect(result).toEqual({ type: "err", value: 100 }) // ERR-NOT-AUTHORIZED
  })
  
  it("should fail to revoke verification for a seller that is not verified", () => {
    const result = sellerVerification.revokeVerification(mockPrincipals.admin, mockPrincipals.seller1)
    expect(result).toEqual({ type: "err", value: 102 }) // ERR-NOT-VERIFIED
  })
  
  it("should transfer admin rights successfully", () => {
    const result = sellerVerification.transferAdmin(mockPrincipals.admin, mockPrincipals.seller1)
    expect(result).toEqual({ type: "ok", value: true })
    expect(state.admin).toBe(mockPrincipals.seller1)
  })
  
  it("should fail to transfer admin rights if not admin", () => {
    const result = sellerVerification.transferAdmin(mockPrincipals.seller1, mockPrincipals.seller2)
    expect(result).toEqual({ type: "err", value: 100 }) // ERR-NOT-AUTHORIZED
    expect(state.admin).toBe(mockPrincipals.admin)
  })
})
