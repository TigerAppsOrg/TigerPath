docker run -it -p 8000:8000 --mount src=$(pwd),target=/opt/tigerpath,type=bind -e DEBUG=1 tigerpath
