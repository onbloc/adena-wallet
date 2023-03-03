#!/bin/sh
git submodule deinit packages/adena-torus-signin
git rm --cached packages/adena-torus-signin
rm -rf .git/modules/packages/adena-torus-signin
rm -rf packages/adena-torus-signin

git submodule add git@github.com:onbloc/adena-torus-signin.git packages/adena-torus-signin <<!       
yes
!