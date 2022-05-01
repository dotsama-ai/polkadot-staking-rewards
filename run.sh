#!/bin/bash

function start () {
    
    # remove data
    rm -rf ./.data

    #package install
    yarn install
    yarn codegen
    yarn build

    #start container
    docker-compose up
}

start