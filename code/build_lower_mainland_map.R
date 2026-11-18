suppressPackageStartupMessages(library(sf))
Sys.setenv(OMP_NUM_THREADS = "1")
data.table::setDTthreads(1)

source_zip <- "/home/arvin/2TBstorage/gitarchive/databases/CANADA_datasets/canada_census_2021/lcsd000b21a_e.zip"
source_file <- paste0("/vsizip/", source_zip, "/lcsd000b21a_e.shp")

csd <- st_read(source_file, quiet = TRUE)
csd <- csd[substr(csd$CSDUID, 1, 4) %in% c("5915", "5909"), ]
csd <- st_transform(csd, 3347)
csd <- st_make_valid(csd)

# Crop to populated Lower Mainland / Fraser Valley corridor (West Vancouver to Hope)
corridor <- st_as_sfc(st_bbox(c(xmin = -123.3, ymin = 49.0, xmax = -121.3, ymax = 49.45), crs = st_crs(4326)))
crop_poly <- st_transform(corridor, st_crs(csd))
crop_box <- st_bbox(crop_poly)
csd_cropped <- suppressWarnings(st_intersection(csd, crop_poly))
csd_cropped <- csd_cropped[!st_is_empty(csd_cropped), ]
csd_cropped$geometry <- st_simplify(csd_cropped$geometry, dTolerance = 100, preserveTopology = TRUE)
csd_cropped <- csd_cropped[!st_is_empty(csd_cropped), ]

width <- 960
height <- ceiling(900 * (crop_box["ymax"] - crop_box["ymin"]) / (crop_box["xmax"] - crop_box["xmin"])) + 60
scale <- min(width / (crop_box["xmax"] - crop_box["xmin"]),
             height / (crop_box["ymax"] - crop_box["ymin"]))
offset_x <- (width - (crop_box["xmax"] - crop_box["xmin"]) * scale) / 2
offset_y <- (height - (crop_box["ymax"] - crop_box["ymin"]) * scale) / 2

xy <- function(points) {
  coords <- st_coordinates(points)
  cbind(offset_x + (coords[, 1] - crop_box["xmin"]) * scale,
        height - offset_y - (coords[, 2] - crop_box["ymin"]) * scale)
}

path_data <- function(geom) {
  rings <- st_coordinates(geom)
  if (!nrow(rings)) return("")
  has_l2 <- "L2" %in% colnames(rings)
  has_l3 <- "L3" %in% colnames(rings)
  grp <- if (has_l3) interaction(rings[, "L1"], rings[, "L2"], rings[, "L3"], drop = TRUE)
         else if (has_l2) interaction(rings[, "L1"], rings[, "L2"], drop = TRUE)
         else factor(rings[, "L1"])
  groups <- split(seq_len(nrow(rings)), grp)
  parts <- vapply(groups, function(ids) {
    if (length(ids) < 3) return("")
    allpts <- cbind(offset_x + (rings[ids, "X"] - crop_box["xmin"]) * scale,
                    height - offset_y - (rings[ids, "Y"] - crop_box["ymin"]) * scale)
    paste0("M", paste(format(round(allpts[, 1], 1), trim = TRUE),
                      format(round(allpts[, 2], 1), trim = TRUE), collapse = " L"), " Z")
  }, character(1))
  paste(parts[nzchar(parts)], collapse = " ")
}

xml_escape <- function(x) {
  x <- gsub("&", "&amp;", x, fixed = TRUE)
  x <- gsub("<", "&lt;", x, fixed = TRUE)
  gsub("\"", "&quot;", x, fixed = TRUE)
}

palette_cls <- c("s0", "s1", "s2", "s3")
palette_hex <- c("#b8c9a9", "#a9bd99", "#c4d3b6", "#9fb48f")

lines <- c(
  sprintf('<svg class="lower-mainland-map" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 %d %d" role="img" aria-label="Map of Metro Vancouver and Fraser Valley communities">', width, height),
  '<g>'
)

for (i in seq_len(nrow(csd_cropped))) {
  d <- path_data(st_geometry(csd_cropped[i, ]))
  if (!nzchar(d)) next
  idx <- (i - 1) %% 4 + 1
  lines <- c(lines, sprintf(
    '<path class="cd %s" fill="%s" stroke="#f8f5ee" d="%s"><title>%s</title></path>',
    palette_cls[idx], palette_hex[idx], d, xml_escape(csd_cropped$CSDNAME[i])
  ))
}
lines <- c(lines, '</g>')

# Reached communities in Lower Mainland / Fraser Valley (pins at census subdivision centroids, same as bc-map.svg)
reached <- c("Agassiz", "Abbotsford", "Richmond", "Vancouver")
pin_boxes <- list()
pin_lines <- c('<g>')
for (name in reached) {
  lookup <- if (name == "Agassiz") "Kent" else name
  i <- which(tolower(csd$CSDNAME) == tolower(lookup))
  if (!length(i)) next
  pt <- st_centroid(st_geometry(csd[i[1], ]))
  pos <- xy(pt)[1, ]
  # Reserve pin bounding box (teardrop extends ~19px up, ~8px left/right)
  pin_boxes[[length(pin_boxes) + 1]] <- c(pos[1] - 9, pos[2] - 20, pos[1] + 9, pos[2] + 2)
  pin_lines <- c(pin_lines, sprintf(
    '<g class="place-pin" data-community="%s" transform="translate(%.1f %.1f)"><path class="pin-shape" fill="#ddaa4c" stroke="#0b2d4e" stroke-width="1.4" fill-rule="evenodd" d="M 0 0 C -3.2 -6 -7.5 -10.3 -7.5 -15 A 7.5 7.5 0 1 1 7.5 -15 C 7.5 -10.3 3.2 -6 0 0 Z M 0 -18 A 3 3 0 1 0 0 -12 A 3 3 0 1 0 0 -18 Z"/><title>%s</title></g>',
    xml_escape(name), pos[1], pos[2], xml_escape(name)
  ))
}
pin_lines <- c(pin_lines, '</g>')

# Municipality labels (required places first, then extras that fit without overlap)
label_specs <- list(
  list(label = "Vancouver", lookup = "Vancouver", type = "CY"),
  list(label = "West Vancouver", lookup = "West Vancouver", type = "DM"),
  list(label = "North Vancouver", lookup = "North Vancouver", type = "DM"),
  list(label = "Burnaby", lookup = "Burnaby", type = "CY"),
  list(label = "Richmond", lookup = "Richmond", type = "CY"),
  list(label = "Coquitlam", lookup = "Coquitlam", type = "CY"),
  list(label = "Port Coquitlam", lookup = "Port Coquitlam", type = "CY"),
  list(label = "Surrey", lookup = "Surrey", type = "CY"),
  list(label = "Delta", lookup = "Delta", type = "CY"),
  list(label = "Langley", lookup = "Langley", type = "DM"),
  list(label = "Maple Ridge", lookup = "Maple Ridge", type = "CY"),
  list(label = "Mission", lookup = "Mission", type = "DM"),
  list(label = "Abbotsford", lookup = "Abbotsford", type = "CY"),
  list(label = "Chilliwack", lookup = "Chilliwack", type = "CY"),
  list(label = "Agassiz", lookup = "Kent", type = "DM"),
  list(label = "Hope", lookup = "Hope", type = "DM"),
  list(label = "White Rock", lookup = "White Rock", type = "CY"),
  list(label = "New Westminster", lookup = "New Westminster", type = "CY"),
  list(label = "Pitt Meadows", lookup = "Pitt Meadows", type = "CY"),
  list(label = "Port Moody", lookup = "Port Moody", type = "CY"),
  list(label = "Harrison Hot Springs", lookup = "Harrison Hot Springs", type = "VL")
)

boxes_overlap <- function(a, b, pad = 2) {
  (a[1] - pad) < b[3] && (a[3] + pad) > b[1] && (a[2] - pad) < b[4] && (a[4] + pad) > b[2]
}

label_boxes <- list()
label_lines <- c('<g>')

# Candidate offsets: (dx, dy, anchor)
candidates <- list(
  c(0, 4, "middle"),
  c(0, -10, "middle"),
  c(0, 15, "middle"),
  c(10, 4, "start"),
  c(-10, 4, "end"),
  c(10, -8, "start"),
  c(-10, -8, "end"),
  c(10, 15, "start"),
  c(-10, 15, "end"),
  c(0, -22, "middle"),
  c(0, 26, "middle"),
  c(16, 4, "start"),
  c(-16, 4, "end"),
  c(16, -14, "start"),
  c(-16, -14, "end")
)

# Search nearby positions first, then wider offsets with leader lines.
for (dy in c(-35, 35, -65, 65, -95, 95, -125, 125)) {
  for (dx in c(0, -45, 45, -90, 90, -135, 135)) {
    candidates[[length(candidates) + 1]] <- c(dx, dy, "middle")
  }
}
placed_names <- character()
for (spec in label_specs) {
  idx <- which(tolower(csd_cropped$CSDNAME) == tolower(spec$lookup) & csd_cropped$CSDTYPE == spec$type)
  if (!length(idx)) idx <- which(tolower(csd_cropped$CSDNAME) == tolower(spec$lookup))
  if (!length(idx)) next
  pt <- st_point_on_surface(st_geometry(csd_cropped[idx[1], ]))
  pos <- xy(pt)[1, ]
  lw <- nchar(spec$label) * 11 + 6
  lh <- 25
  chosen <- NULL
  for (cand in candidates) {
    dx <- as.numeric(cand[1])
    dy <- as.numeric(cand[2])
    anc <- cand[3]
    lx <- pos[1] + dx
    ly <- pos[2] + dy
    x0 <- if (anc == "middle") lx - lw / 2 else if (anc == "end") lx - lw else lx
    x1 <- x0 + lw
    y0 <- ly - 20
    y1 <- y0 + lh
    if (x0 < 4 || x1 > (width - 4) || y0 < 4 || y1 > (height - 4)) next
    b <- c(x0, y0, x1, y1)
    hit_label <- length(label_boxes) > 0 && any(vapply(label_boxes, boxes_overlap, logical(1), b = b, pad = 2))
    hit_pin <- length(pin_boxes) > 0 && any(vapply(pin_boxes, boxes_overlap, logical(1), b = b, pad = 2))
    if (!hit_label && !hit_pin) {
      chosen <- list(x = lx, y = ly, anchor = anc, box = b)
      break
    }
  }
  if (!is.null(chosen)) {
    label_boxes[[length(label_boxes) + 1]] <- chosen$box
    placed_names <- c(placed_names, spec$label)
    if (sqrt((chosen$x - pos[1])^2 + (chosen$y - pos[2])^2) > 25) {
      label_lines <- c(label_lines, sprintf('<path class="label-leader" fill="none" stroke="#0b2d4e" stroke-width="0.8" d="M%.1f %.1f L%.1f %.1f"/>', pos[1], pos[2], max(chosen$box[1], min(pos[1], chosen$box[3])), max(chosen$box[2], min(pos[2], chosen$box[4]))))
    }
    label_lines <- c(label_lines, sprintf(
      '<text class="place" fill="#0b2d4e" stroke="#f8f5ee" stroke-width="3" paint-order="stroke" font-family="DejaVu Sans, sans-serif" font-size="18" font-weight="600" x="%.1f" y="%.1f" text-anchor="%s">%s</text>',
      chosen$x, chosen$y, chosen$anchor, xml_escape(spec$label)
    ))
  }
}
label_lines <- c(label_lines, '</g>')

# Verify zero overlaps among placed labels
overlap_count <- 0L
if (length(label_boxes) > 1) {
  for (i in seq_len(length(label_boxes) - 1)) {
    for (j in (i + 1):length(label_boxes)) {
      if (boxes_overlap(label_boxes[[i]], label_boxes[[j]], pad = 0)) {
        overlap_count <- overlap_count + 1L
        cat(sprintf("Overlap: %s / %s\n", placed_names[i], placed_names[j]))
      }
    }
  }
}

stopifnot(all(vapply(label_specs[1:16], function(spec) spec$label %in% placed_names, logical(1))), overlap_count == 0L)
lines <- c(lines, label_lines, pin_lines, '</svg>')
writeLines(lines, "assets/lower-mainland-map.svg")

cat(sprintf("Placed %d labels: %s\n", length(placed_names), paste(placed_names, collapse = ", ")))
cat(sprintf("Label overlap count: %d\n", overlap_count))
cat(sprintf("SVG size: %d bytes\n", file.info("assets/lower-mainland-map.svg")$size))
