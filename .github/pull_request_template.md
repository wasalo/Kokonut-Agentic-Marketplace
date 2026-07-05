# Pull Request Template

## Description

<!-- Briefly describe the changes in this PR -->

## Type of Change

- [ ] Bug fix (non-breaking change that fixes an issue)
- [ ] New feature (non-breaking change that adds functionality)
- [ ] Breaking change (fix or feature that would cause existing functionality to not work as expected)
- [ ] Documentation update
- [ ] Refactoring (no functional changes)
- [ ] Security fix
- [ ] CI / infrastructure

## Checklist

- [ ] I have tested my changes locally
- [ ] I have added necessary documentation (if applicable)
- [ ] I have added tests that prove my fix is effective or my feature works
- [ ] I have checked for linting errors (`pnpm run lint`)
- [ ] I have checked for type errors (`pnpm run type-check`)
- [ ] Smart contracts: I have verified tests pass (`forge test`)
- [ ] Smart contracts: Storage layout is compatible (`node scripts/check-storage-layout.js`)
- [ ] I have verified build succeeds (`pnpm run build`)
- [ ] No secrets, private keys, or `.env` files in the diff

## Screenshots (if applicable)

<!-- Add screenshots to demonstrate changes -->

## Additional Notes

<!-- Any additional context or information reviewers should know -->

## Related Issues

<!-- Link to related issues: Closes #123, Fixes #456 -->

## Deployment Notes (if applicable)

<!-- Notes about deployment steps or environment variables needed -->
