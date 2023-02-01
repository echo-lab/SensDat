'''
This is just a convenient python script which takes a CSV and downsamples it.
It also corrects the distance-from-last column when downsampling.
It also corrects the 12AM/PM bug in most of the data we have :)

If anyone is using this script in the future, please read over it and make sure
it actually does what you want and works with your data!
'''
import csv

DOWNSAMPLE_RATE = 4

# Order,Latitude,Longitude,Elevation,Date Created,Distance from Start,Distance from Last,Bearing,Speed
ORDER_IDX = 0
DATE_IDX = 4
DIST_IDX = 6

inp = "../public/study_candidate1.csv"
out = "../public/cleaned-study-candidate1.csv"

def fix_time(date_col):
    date, time, am_pm = date_col.split(" ")
    HH, MM, SS = time.split(":")
    if HH != "12":
        return date_col
    
    am_pm = "AM" if am_pm == "PM" else "PM"
    return " ".join((date, time, am_pm))

with open(inp) as in_file, open(out, mode="w") as out_file:
    reader = csv.reader(in_file, delimiter=',')
    writer = csv.writer(out_file, delimiter=',', quotechar='"', quoting=csv.QUOTE_MINIMAL)

    count = 0
    dist = 0
    for (idx, row) in enumerate(reader):
        if (idx == 0):
            writer.writerow(row)
            continue

        dist += float(row[DIST_IDX])
        
        if (idx % DOWNSAMPLE_RATE == 1):
            count += 1
            row[ORDER_IDX] = count
            row[DIST_IDX] = str(round(dist, 3))
            row[DATE_IDX] = fix_time(row[DATE_IDX])
            writer.writerow(row)
            dist = 0