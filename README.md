# activate-unity-license

A GitHub Action for activating a [Unity Game Engine](https://unity.com) license on GitHub Action Runners.

## How to use

This action uses your stored environment secrets to authenticate with the Unity Licensing servers.

***It's important that you disable other forks of your repository to run actions in pull requests from unknown contributors.***

> Read more on [Approving workflow runs from public forks](
https://docs.github.com/en/actions/managing-workflow-runs/approving-workflow-runs-from-public-forks)

[![Managing GitHub Actions settings for a repository](RecommendedSecuritySettings.png)](https://docs.github.com/en/repositories/managing-your-repositorys-settings-and-features/enabling-features-for-your-repository/managing-github-actions-settings-for-a-repository)

### workflow

```yaml
steps:
  - uses: RageAgainstThePixel/activate-unity-license@v1
    with:
      license: 'Personal' # Choose license type to use [ Personal, Professional ]
      username: ${{ secrets.UNITY_USERNAME }}
      password: ${{ secrets.UNITY_PASSWORD }}
      # serial: ${{ secrets.UNITY_SERIAL }} # Required for pro activations
```

### inputs

This action requires several secrets that need to be setup in the repository or organization's action secret store.

* `UNITY_USERNAME` The email address you use for your Unity Id
* `UNITY_PASSWORD` The password you use for Unity Id access
* `UNITY_SERIAL` Optional, but required for pro activations

> [!IMPORTANT]
> Don't forget that pro licenses only support 2 active licenses at a time!

| name | description | required |
| ---- | ----------- | -------- |
| license | Must be one of `Personal` or `Professional` | true |
| username | The email address you use for your Unity Id | true |
| password | The password you use for Unity Id access | true |
| serial | Unity Serial License | Required for `Professional` license activations |
