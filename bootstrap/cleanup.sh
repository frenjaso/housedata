#!/bin/bash

aws s3 rm s3://codepipeline-housedata-testing3 --recursive
aws cloudformation delete-stack --stack-name myteststack26
aws cloudformation delete-stack --stack-name MyTestStackName45