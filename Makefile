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

# This ``string`` is automatically appended to the ``basename`` of static
# assets (as specified in ``BUILD_ASSETS_RAW).
#
# It has to be synchronized with the ``posthtml`` configuration and with the
# ``*.html`` source files.
BUSTING_PATTERN := "[BUSTING]"

# Build directory
BUILD_DIR := $(REPO_ROOT)/dist

# Where to put *.html files?
BUILD_HTML_DIR := $(BUILD_DIR)

# Where to put static assets, like stylesheets / scripts?
BUILD_ASSETS_DIR := $(BUILD_DIR)/assets

# The actual filenames of assets to be built.
BUILD_ASSETS_RAW := style.css colorizer.js

# These are the actual assets to be built.
#
# Starting with the ``BUILD_ASSETS_RAW``, the ``BUSTING_PATTERN`` is appended
# to the ``basename`` and then the file ``suffix`` is re-appended. Finally,
# all files are prefixed with ``BUILD_ASSETS_DIR`` to apply the actual build
# path.
BUILD_ASSETS := $(addprefix \
                  $(BUILD_ASSETS_DIR)/, \
                  $(join \
                    $(addsuffix \
                      .$(BUSTING_PATTERN), \
                      $(basename $(BUILD_ASSETS_RAW)) \
                    ), \
                    $(suffix $(BUILD_ASSETS_RAW)) \
                  ) \
                )

# Source directory
SRC_DIR := $(REPO_ROOT)/src

# All script source files, meant to be used as a dependency/prerequisite
SRC_SCRIPT := $(shell find $(SRC_DIR)/script -type f)

# All style source files, meant to be used as a dependency/prerequisite
SRC_STYLE := $(shell find $(SRC_DIR)/style -type f)

# Stamps
#
# Track certain things with artificial *stamps*.
STAMP_DIR := $(REPO_ROOT)/.make-stamps
STAMP_NODE_READY := $(STAMP_DIR)/node-ready
STAMP_GIT_HOOKS := $(STAMP_DIR)/git-hooks

# INTERNAL FLAGS
DEV_FLAG := dev

# ``make``-specific settings
.SILENT :
.DELETE_ON_ERROR :
MAKEFLAGS += --no-print-directory
MAKEFLAGS += --warn-undefined-variables
MAKEFLAGS += --no-builtin-rules

# ### RECIPES

# Build the application
#
# This builds the JS from TypeScript sources and the stylesheet from SCSS
# sources.
build : $(BUILD_HTML_DIR)/index.html
.PHONY : build

# Build in development mode
#
# Build for development, providing source maps etc...
# This forces a rebuild every time!
build/development :
	touch $(SRC_DIR)/index.html && \
    touch $(firstword $(SRC_SCRIPT)) && \
    touch $(firstword $(SRC_STYLE)) && \
    BUILD_MODE=$(DEV_FLAG) \
    $(MAKE) build
.PHONY : build/development

# Run ``PostHTML`` to apply cache-busting for the static assets.
#
# Please note: In *development mode*, the ``index.html`` is simply copied to
# the build directory.
#
# Please note: ``PostHTML`` / ``posthtml-hash`` do only work with relative
# file paths. The whole setup of ``Makefile``, ``posthtml.config.js`` and
# the build artifacts is fragile!
$(BUILD_HTML_DIR)/index.html : $(SRC_DIR)/index.html $(BUILD_ASSETS) posthtml.config.js | $(STAMP_NODE_READY)
	$(create_dir)
ifeq ($(BUILD_MODE), $(DEV_FLAG))
	echo "[development] building script bundle..."
	cp $< $@
else
	cp $< $@ && \
    npx posthtml $(subst $(REPO_ROOT)/, "", $@) -o $(subst $(REPO_ROOT)/, "", $@) -c posthtml.config.js
endif

# Run ``rollup`` to compile TS sources and bundle them
#
# ``rollup`` (or its TypeScript plugin, to be precise) will perform the
# typechecking, so there is no need to call ``util/lint/typecheck`` manually.
$(BUILD_ASSETS_DIR)/%.$(BUSTING_PATTERN).js : $(SRC_DIR)/script/%.ts $(SRC_SCRIPT) .rollup.config.js tsconfig.json | $(STAMP_NODE_READY)
	$(create_dir)
ifeq ($(BUILD_MODE), $(DEV_FLAG))
	echo "[development] building script bundle..."
	DEV_FLAG=$(DEV_FLAG) \
    npx rollup -c .rollup.config.js --bundleConfigAsCjs -i $< -o $@
else
	npx rollup -c .rollup.config.js --bundleConfigAsCjs -i $< -o $@
endif

# Run ``sass`` to compile SASS/SCSS sources to CSS
$(BUILD_ASSETS_DIR)/%.$(BUSTING_PATTERN).css : $(SRC_DIR)/style/%.scss $(SRC_STYLE) postcss.config.js | $(STAMP_NODE_READY)
	$(create_dir)
ifeq ($(BUILD_MODE), $(DEV_FLAG))
	echo "[development] building stylesheet..."
	DEV_FLAG=$(DEV_FLAG) \
    npx sass --verbose --embed-sources --embed-source-map --stop-on-error $< | \
    npx postcss -o $@
else
	npx sass --verbose --stop-on-error $< | \
    npx postcss -o $@
endif

# ##### Development Utilities

# Run ``eslint`` against script source files
util/lint/eslint : | $(STAMP_NODE_READY)
	npx eslint --fix "**/*.ts"
.PHONY : util/lint/eslint

# Run ``prettier`` against all files in the current directory
util/lint/prettier : | $(STAMP_NODE_READY)
	npx prettier . --ignore-unknown --write
.PHONY : util/lint/prettier

# Run ``stylelint`` on SCSS sources
util/lint/stylelint : | $(STAMP_NODE_READY)
	npx stylelint . --fix
.PHONY : util/lint/stylelint

# Run ``tsc`` to typecheck the script source files
util/lint/typecheck : tsconfig.json | $(STAMP_NODE_READY)
	npx tsc --project tsconfig.json
.PHONY : util/lint/typecheck

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
