import { describe, it, expect, beforeEach } from "vitest"

// Mock implementation for testing Clarity contracts
const mockPrincipals = {
  admin: "ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM",
  verifier1: "ST2CY5V39NHDPWSXMW9QDT3HC3GD6Q6XX4CFRK9AG",
  verifier2: "ST2JHG361ZXG51QTKY2NQCVBPPRRE2KZB1HR05NNC",
  nonVerifier: "ST3AM1A56AK2C1XAFJ4115ZSV26EB49BVQ10MGCS0",
}

// Constants
const CONDITION = {
  EXCELLENT: 5,
  GOOD: 4,
  FAIR: 3,
  POOR: 2,
  BROKEN: 1,
}

// Mock state
let state = {
  admin: mockPrincipals.admin,
  authorizedVerifiers: new Map(),
  assetConditions: new Map(),
}

// Mock contract functions
const conditionVerification = {
  addVerifier: (caller: string, verifier: string) => {
    if (caller !== state.admin) {
      return { type: "err", value: 100 } // ERR-NOT-AUTHORIZED
    }
    
    state.authorizedVerifiers.set(verifier, true)
    return { type: "ok", value: true }
  },
  
  removeVerifier: (caller: string, verifier: string) => {
    if (caller !== state.admin) {
      return { type: "err", value: 100 } // ERR-NOT-AUTHORIZED
    }
    
    state.authorizedVerifiers.delete(verifier)
    return { type: "ok", value: true }
  },
  
  verifyCondition: (caller: string, assetId: number, condition: number, details: string) => {
    if (!state.authorizedVerifiers.has(caller)) {
      return { type: "err", value: 102 } // ERR-NOT-VERIFIER
    }
    
    if (condition < CONDITION.BROKEN || condition > CONDITION.EXCELLENT) {
      return { type: "err", value: 101 } // ERR-INVALID-CONDITION
    }
    
    state.assetConditions.set(assetId, {
      condition,
      details,
      verifiedBy: caller,
      verifiedAt: 123, // Mock block height
    })
    
    return { type: "ok", value: true }
  },
  
  getAssetCondition: (assetId: number) => {
    return state.assetConditions.get(assetId) || null
  },
  
  isAuthorizedVerifier: (verifier: string) => {
    return state.authorizedVerifiers.has(verifier)
  },
  
  transferAdmin: (caller: string, newAdmin: string) => {
    if (caller !== state.admin) {
      return { type: "err", value: 100 } // ERR-NOT-AUTHORIZED
    }
    
    state.admin = newAdmin
    return { type: "ok", value: true }
  },
}

describe("Condition Verification Contract", () => {
  beforeEach(() => {
    // Reset state before each test
    state = {
      admin: mockPrincipals.admin,
      authorizedVerifiers: new Map(),
      assetConditions: new Map(),
    }
  })
  
  it("should add a verifier successfully", () => {
    const result = conditionVerification.addVerifier(mockPrincipals.admin, mockPrincipals.verifier1)
    expect(result).toEqual({ type: "ok", value: true })
    expect(conditionVerification.isAuthorizedVerifier(mockPrincipals.verifier1)).toBe(true)
  })
  
  it("should fail to add a verifier if not admin", () => {
    const result = conditionVerification.addVerifier(mockPrincipals.verifier1, mockPrincipals.verifier2)
    expect(result).toEqual({ type: "err", value: 100 }) // ERR-NOT-AUTHORIZED
    expect(conditionVerification.isAuthorizedVerifier(mockPrincipals.verifier2)).toBe(false)
  })
  
  it("should remove a verifier successfully", () => {
    conditionVerification.addVerifier(mockPrincipals.admin, mockPrincipals.verifier1)
    const result = conditionVerification.removeVerifier(mockPrincipals.admin, mockPrincipals.verifier1)
    expect(result).toEqual({ type: "ok", value: true })
    expect(conditionVerification.isAuthorizedVerifier(mockPrincipals.verifier1)).toBe(false)
  })
  
  it("should verify an asset condition successfully", () => {
    conditionVerification.addVerifier(mockPrincipals.admin, mockPrincipals.verifier1)
    const result = conditionVerification.verifyCondition(
        mockPrincipals.verifier1,
        1, // Asset ID
        CONDITION.GOOD,
        "Equipment is in good working condition with minor wear",
    )
    
    expect(result).toEqual({ type: "ok", value: true })
    
    const condition = conditionVerification.getAssetCondition(1)
    expect(condition).toEqual({
      condition: CONDITION.GOOD,
      details: "Equipment is in good working condition with minor wear",
      verifiedBy: mockPrincipals.verifier1,
      verifiedAt: 123,
    })
  })
  
  it("should fail to verify condition if not an authorized verifier", () => {
    const result = conditionVerification.verifyCondition(
        mockPrincipals.nonVerifier,
        1, // Asset ID
        CONDITION.GOOD,
        "Equipment is in good working condition with minor wear",
    )
    
    expect(result).toEqual({ type: "err", value: 102 }) // ERR-NOT-VERIFIER
  })
  
  it("should fail to verify condition with invalid condition value", () => {
    conditionVerification.addVerifier(mockPrincipals.admin, mockPrincipals.verifier1)
    const result = conditionVerification.verifyCondition(
        mockPrincipals.verifier1,
        1, // Asset ID
        10, // Invalid condition value
        "Equipment is in good working condition with minor wear",
    )
    
    expect(result).toEqual({ type: "err", value: 101 }) // ERR-INVALID-CONDITION
  })
  
  it("should transfer admin rights successfully", () => {
    const result = conditionVerification.transferAdmin(mockPrincipals.admin, mockPrincipals.verifier1)
    expect(result).toEqual({ type: "ok", value: true })
    expect(state.admin).toBe(mockPrincipals.verifier1)
  })
})
