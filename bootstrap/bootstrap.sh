#!/bin/bash

aws cloudformation create-stack \
--stack-name myteststack26 \
--template-body "file://$(realpath bootstrap/pipeline_cloudformation.json)" \
--capabilities CAPABILITY_IAM