#!/bin/bash
set -euo pipefail

shellcheck --version

cd ./cbps-network-nano-bash && shellcheck *.sh
