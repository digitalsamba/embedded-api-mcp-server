# Handover Verification Checklist

## Purpose
This checklist prevents misinformation in session handover documentation by requiring verification of all claims before documenting them.

## Pre-Handover Verification Steps

### 1. System Status Verification
- [ ] **Run `npm test`** - Verify actual test status vs documented status
- [ ] **Run `npm run build`** - Verify build system works
- [ ] **Check `git status`** - Verify actual git state vs documented state
- [ ] **Check package.json** - Verify current configuration

### 2. Issue Classification Verification
Before marking anything as "broken" or "critical":
- [ ] **Distinguish between configuration issues vs test failures**
- [ ] **Verify error messages match documented problems**
- [ ] **Test actual functionality to confirm if it's working**
- [ ] **Check if "broken" systems are actually functioning**

### 3. Documentation Cross-Reference
- [ ] **Check TodoList vs SESSION-HANDOVER consistency**
- [ ] **Verify claims match actual system behavior**
- [ ] **Update project tracking docs with verified information**
- [ ] **Ensure priority levels match actual impact**

### 4. Historical Context Check
- [ ] **Review recent commits for what was actually fixed**
- [ ] **Check if previously "broken" items are now working**
- [ ] **Verify assumptions about system state**

## Common Documentation Errors to Avoid

### ❌ **Don't Document Without Verification**
- Claiming Jest is "broken" without running tests
- Assuming configuration issues without checking actual behavior
- Copying previous session errors without re-verification

### ✅ **Do Verify Before Documenting**
- Run the actual commands to confirm status
- Test the functionality being described
- Distinguish between tool errors and test failures

## Verification Commands Checklist

```bash
# Always run these before creating handover docs:
npm test                    # Verify test status
npm run build              # Verify build works  
npm run dev:clean          # Verify dev environment
git status                 # Verify git state
npm run lint               # Verify code quality
```

## Documentation Update Process

1. **Run verification commands**
2. **Record actual results (not assumptions)**
3. **Update TodoList with verified priorities**
4. **Update SESSION-HANDOVER with verified status**
5. **Cross-check all documents for consistency**

## Prevention Strategy

- **Mandatory**: Run verification commands before each handover
- **Requirement**: All "broken" or "critical" claims must be verified
- **Process**: Test actual functionality vs. documented problems
- **Review**: Previous session claims should be re-verified

---
*Created: 2025-05-31 - To prevent Jest configuration misinformation incident*