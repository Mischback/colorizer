# SPDX-FileCopyrightText: 2023 Mischback
# SPDX-License-Identifier: MIT
# SPDX-FileType: SOURCE

# ### INTERNAL SETTINGS

# The absolute path to the repository.
#
# This assumes that this ``Makefile`` is placed in the root of the repository.
# REPO_ROOT does not contain a trailing ``/``
#
# Ref: https://stackoverflow.com/a/324782
# Ref: https://stackoverflow.com/a/2547973
# Ref: https://stackoverflow.com/a/73450593
REPO_ROOT := $(patsubst %/, %, $(dir $(abspath $(lastword $(MAKEFILE_LIST)))))

# Stamps
#
# Track certain things with artificial *stamps*.
STAMP_DIR := $(REPO_ROOT)/.make-stamps
STAMP_NODE_READY := $(STAMP_DIR)/node-ready
STAMP_GIT_HOOKS := $(STAMP_DIR)/git-hooks


# ##### Recipes

# ##### Development Utilities

# Run ``prettier`` against all files in the current directory
util/lint/prettier : $(STAMP_NODE_READY)
	npx prettier . --ignore-unknown --write
.PHONY : util/lint/prettier

# Setup the git hooks
util/githooks : $(STAMP_GIT_HOOKS)
.PHONY : util/githooks


# ##### Internal utility stuff

# Apply configured hooks of ``simple-git-hooks``
$(STAMP_GIT_HOOKS) : .simple-git-hooks.json | $(STAMP_NODE_READY)
	$(create_dir)
	npx simple-git-hooks
	touch $@

# Install the required NodeJS packages
#
# Uses npm's ``ci`` to create the required NodeJS environment. It (re-) uses
# a local cache for npm in order to speed up builds during CI.
#
# https://stackoverflow.com/a/58187176
$(STAMP_NODE_READY) : package.json package-lock.json
	$(create_dir)
	npm ci --cache .npm --prefer-offline
	touch $@

# Create a directory as required by other recipes
create_dir = @mkdir -p $(@D)
