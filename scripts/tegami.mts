import { tegami } from "tegami"
import { runCli } from "tegami/cli"
import { github } from "tegami/plugins/github"

const paper = tegami({
  plugins: [
    github({
      repo: "noxify/casl-drizzle",
      versionPr: {
        base: "main",
      },

      release: {
        create({ tag, pkg }) {
          return {
            title: tag,
            notes: `Released ${pkg.name}`,
            prerelease: false,
          }
        },
      },
    }),
  ],
})

await runCli(paper)
